import threading
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


# ---------------------------------------------------------------------------
# Engine and session factory — created once at module import time.
# Schema management is handled exclusively by Alembic; the app never calls
# create_all / drop_all.
# ---------------------------------------------------------------------------

engine: AsyncEngine = create_async_engine(
    settings.database_url,
    echo=settings.db_echo,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_pre_ping=True,
    pool_recycle=3600,
)

AsyncSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ---------------------------------------------------------------------------
# Executor-path sessions — for DB access that runs in worker threads with
# their own event loops (e.g. the chatbot LangGraph thread pool).
#
# The main engine uses a connection pool bound to the app's event loop.
# Reusing pooled connections from a thread that creates/closes its own loop
# per call raises asyncpg "attached to a different loop" errors. A single
# shared NullPool engine is also unsafe when several threads use it
# concurrently (async engines must not be shared across running loops).
# Instead each worker thread lazily creates its OWN NullPool engine: every
# connection is created and used within one loop and one thread.
# ---------------------------------------------------------------------------

_thread_local = threading.local()


def ExecutorSessionLocal() -> AsyncSession:
    """Return an async session bound to a per-thread, per-loop engine."""
    maker = getattr(_thread_local, "sessionmaker", None)
    if maker is None:
        engine = create_async_engine(
            settings.database_url,
            echo=settings.db_echo,
            poolclass=NullPool,
        )
        maker = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
        _thread_local.sessionmaker = maker
    return maker()


async def close_db() -> None:
    """Dispose the main connection pool. Call once on application shutdown."""
    await engine.dispose()


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Yield a database session for use in a single request.

    - Session is committed by the route handler when the operation succeeds.
    - Session is rolled back automatically if an unhandled exception propagates.
    - Session is always closed when the request context exits.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

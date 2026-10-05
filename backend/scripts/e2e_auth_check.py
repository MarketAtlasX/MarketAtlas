"""End-to-end check of the auth + captcha flow.

Runs the real FastAPI app over an in-memory SQLite database (no Postgres
required) and exercises: captcha issuance, captcha-gated register, /auth/me,
captcha-gated login, and a captcha-less request being rejected.
"""

import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Captcha gate ON, dev-mode ephemeral JWT secret.
os.environ["AUTH_CAPTCHA_ENABLED"] = "true"

from httpx import ASGITransport, AsyncClient  # noqa: E402


async def main() -> int:
    # Import after env vars so settings pick them up. The Postgres-oriented
    # URL composer can't produce a valid SQLite URL and SQLite rejects pool
    # sizing kwargs, so shim both before app.database builds its engine.
    from app.config import Settings
    import sqlalchemy.ext.asyncio as _sa_asyncio

    Settings.database_url = property(lambda self: "sqlite+aiosqlite:///:memory:")  # type: ignore[method-assign]

    _real_create = _sa_asyncio.create_async_engine

    def _sqlite_create(url: str, **kwargs):  # type: ignore[no-untyped-def]
        if url.startswith("sqlite"):
            kwargs.pop("pool_size", None)
            kwargs.pop("max_overflow", None)
            kwargs.pop("pool_recycle", None)
            kwargs.setdefault("poolclass", _sa_asyncio.AsyncAdaptedQueuePool if False else None) or kwargs.pop("poolclass", None)
            kwargs["connect_args"] = {"check_same_thread": False}
            # Reuse one shared in-memory DB across sessions.
            from sqlalchemy.pool import StaticPool

            kwargs["poolclass"] = StaticPool
        return _real_create(url, **kwargs)

    _sa_asyncio.create_async_engine = _sqlite_create  # type: ignore[assignment]

    from app.database import get_db
    from app.models.user import User
    from sqlalchemy.ext.asyncio import create_async_engine
    from app.main import app

    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    # Only the auth surface is under test; the full schema uses Postgres-only
    # types (JSONB) that SQLite cannot render.
    async with engine.begin() as conn:
        await conn.run_sync(User.__table__.create, checkfirst=True)

    async def override_get_db():
        from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

        maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with maker() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    passed, failed = 0, 0

    def check(name: str, condition: bool, detail: str = "") -> None:
        nonlocal passed, failed
        if condition:
            passed += 1
            print(f"  ok  {name}")
        else:
            failed += 1
            print(f" FAIL {name} {detail}")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Captcha issuance
        r = await client.get("/api/v1/auth/captcha")
        check("GET /auth/captcha returns 200", r.status_code == 200, r.text[:120])
        captcha = r.json()
        check("captcha has id + svg + kind", all(k in captcha for k in ("captcha_id", "svg", "kind")))
        check("svg renders a challenge", captcha["svg"].startswith("<svg"))
        check("answer not present in payload", "answer" not in captcha)

        # 2. Register without captcha is rejected
        r = await client.post(
            "/api/v1/auth/register",
            json={"email": "x@example.com", "password": "password123", "display_name": "X"},
        )
        check("register without captcha -> 400", r.status_code == 400, f"got {r.status_code}")

        # 3. Register with a wrong captcha answer is rejected
        r = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "x@example.com", "password": "password123", "display_name": "X",
                "captcha_id": "nope", "captcha_answer": "wrong",
            },
        )
        check("register with bad captcha -> 400", r.status_code == 400, f"got {r.status_code}")

        # 4. Pull the real answer from the captcha store (single-process store)
        from app.services import captcha_service

        entry = captcha_service._fallback_store.get(captcha["captcha_id"])
        answer = entry[0] if entry else None

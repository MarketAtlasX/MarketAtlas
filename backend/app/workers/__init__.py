"""Async background workers for MarketAtlas.

Celery tasks handle long-running operations:
- AI analysis pipeline (event → signals)
- Market data fetching (yfinance)
- KG enrichment
"""

import asyncio

from app.workers.celery_app import celery_app

# One persistent event loop per worker process. asyncpg connections are bound
# to the loop they were created on, so creating (and closing) a fresh loop per
# task — or inheriting a dead loop across a fork — causes
# "attached to a different loop" / "Event loop is closed" RuntimeErrors.
# Under Celery's prefork pool each forked child lazily creates its own loop and
# reuses it for every task, keeping pooled DB connections on the same loop.
_worker_loop: asyncio.AbstractEventLoop | None = None


def _get_loop() -> asyncio.AbstractEventLoop:
    global _worker_loop
    if _worker_loop is None or _worker_loop.is_closed():
        _worker_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(_worker_loop)
    return _worker_loop


def _run_async(coro):
    """Run an async coroutine from a sync Celery task context.

    Uses a single persistent event loop per process; the loop is never closed
    so pooled asyncpg connections stay valid across task invocations.
    """
    return _get_loop().run_until_complete(coro)


__all__ = ["celery_app", "_run_async"]

"""Tests for scheduled watchlist alert evaluation.

Covers idempotency, overlap protection, stale-lock reclaim, provider outage
handling, and Celery retry behaviour. The market provider is monkeypatched so
results are deterministic.
"""

from datetime import datetime, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.trade import Watchlist
from app.models.user import User
from app.models.watchlist_alert import WatchlistAlertEvalRun, WatchlistAlertEvent, WatchlistAlertRule
from app.services.watchlist_alert_scheduler import evaluate_all_users_alerts


async def _seed(db_session: AsyncSession, email: str, ticker: str = "XOM") -> tuple[User, Watchlist, WatchlistAlertRule]:
    user = User(email=email, hashed_password="x", display_name=email.split("@")[0])
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    item = Watchlist(user_id=user.id, ticker=ticker, asset_type="stock", is_active=True)
    db_session.add(item)
    await db_session.commit()
    await db_session.refresh(item)

    rule = WatchlistAlertRule(
        user_id=user.id,
        watchlist_id=item.id,
        ticker=ticker,
        kind="target_price",
        threshold=130.0,
        cooldown_seconds=900,
        is_active=True,
    )
    db_session.add(rule)
    await db_session.commit()
    await db_session.refresh(rule)
    return user, item, rule


def _quote(price: float, previous_close: float):
    async def _get(ticker: str):
        return {
            "symbol": ticker.upper(),
            "price": price,
            "change": price - previous_close,
            "change_percent": 1.0,
            "previous_close": previous_close,
            "currency": "USD",
            "source": "test-provider",
            "observed_at": datetime.utcnow().isoformat(),
        }

    return _get


async def _events(db_session: AsyncSession) -> list[WatchlistAlertEvent]:
    result = await db_session.execute(select(WatchlistAlertEvent))
    return list(result.scalars().all())


async def _runs(db_session: AsyncSession) -> list[WatchlistAlertEvalRun]:
    result = await db_session.execute(select(WatchlistAlertEvalRun).order_by(WatchlistAlertEvalRun.started_at))
    return list(result.scalars().all())


@pytest.mark.asyncio
async def test_scheduled_run_is_idempotent(db_session: AsyncSession, monkeypatch):
    await _seed(db_session, "sched-idem@test.com")

    import app.services.watchlist_service as svc

    monkeypatch.setattr(svc, "get_stock_quote", _quote(131.0, 129.0))

    first = await evaluate_all_users_alerts(db_session, trigger="scheduled")
    assert first["status"] == "success"
    assert first["triggered"] == 1
    assert first["users_evaluated"] == 1

    # A second run while still above the threshold must not fire again.
    second = await evaluate_all_users_alerts(db_session, trigger="scheduled")
    assert second["status"] == "success"
    assert second["triggered"] == 0

    assert len(await _events(db_session)) == 1
    runs = await _runs(db_session)
    assert [run.status for run in runs] == ["success", "success"]


@pytest.mark.asyncio
async def test_concurrent_run_is_skipped_while_locked(db_session: AsyncSession):
    await _seed(db_session, "sched-lock@test.com")
    # Simulate an in-flight run holding the lock.
    db_session.add(
        WatchlistAlertEvalRun(trigger="scheduled", status="running", started_at=datetime.utcnow())
    )
    await db_session.commit()

    result = await evaluate_all_users_alerts(db_session, trigger="scheduled")
    assert result["status"] == "skipped_locked"
    assert result["triggered"] == 0


@pytest.mark.asyncio
async def test_stale_running_lock_is_reclaimed(db_session: AsyncSession, monkeypatch):
    await _seed(db_session, "sched-stale@test.com")
    db_session.add(
        WatchlistAlertEvalRun(
            trigger="scheduled",
            status="running",
            started_at=datetime.utcnow() - timedelta(seconds=10_000),
        )
    )
    await db_session.commit()

    import app.services.watchlist_service as svc

    monkeypatch.setattr(svc, "get_stock_quote", _quote(131.0, 129.0))

    result = await evaluate_all_users_alerts(db_session, trigger="scheduled")
    assert result["status"] == "success"
    assert result["reclaimed_stale_runs"] == 1
    statuses = sorted(run.status for run in await _runs(db_session))
    assert statuses == ["failed", "success"]


@pytest.mark.asyncio
async def test_provider_outage_does_not_trigger_or_fail(db_session: AsyncSession, monkeypatch):
    await _seed(db_session, "sched-outage@test.com")

    import app.services.watchlist_service as svc

    async def _none(ticker: str):
        return None

    monkeypatch.setattr(svc, "get_stock_quote", _none)

    result = await evaluate_all_users_alerts(db_session, trigger="scheduled")
    assert result["status"] == "success"
    assert result["triggered"] == 0
    assert result["unavailable_tickers"] >= 1
    assert await _events(db_session) == []


def test_task_retries_on_unexpected_failure(monkeypatch):
    from app.workers import watchlist_alert_tasks as mod

    async def _boom(_session, trigger="scheduled"):
        raise RuntimeError("db down")

    monkeypatch.setattr(mod, "evaluate_all_users_alerts", _boom)

    captured: dict = {}

    def _fake_retry(*, exc):
        captured["exc"] = exc
        raise RuntimeError("retried")

    monkeypatch.setattr(mod.evaluate_watchlist_alerts_task, "retry", _fake_retry)

    with pytest.raises(RuntimeError, match="retried"):
        mod.evaluate_watchlist_alerts_task.run()
    assert "db down" in str(captured["exc"])

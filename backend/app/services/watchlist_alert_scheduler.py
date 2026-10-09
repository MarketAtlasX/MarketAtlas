"""Scheduled evaluation of persisted watchlist alert rules.

Runs independently of frontend requests (Celery beat → worker). The run log
doubles as the concurrency guard: a partial unique index allows at most one row
in the ``running`` state, so an overlapping invocation fails fast and is skipped
instead of racing. A stale ``running`` row (crashed worker) is reclaimed after a
TTL so the schedule can never wedge permanently.

Every run records its outcome so ``scheduler_health`` can report the last
successful evaluation and any recent failures. Per-rule provider outages and
cooldowns are handled inside :class:`WatchlistAlertService`; this layer only
fails (and retries) on unexpected errors such as a database outage.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import (
    WATCHLIST_ALERT_LOCK_TTL_SECONDS,
    WATCHLIST_ALERT_SCHEDULE_MINUTES,
)
from app.models.watchlist_alert import WatchlistAlertEvalRun, WatchlistAlertRule
from app.services.watchlist_alert_service import WatchlistAlertService

logger = logging.getLogger(__name__)

__all__ = [
    "WATCHLIST_ALERT_LOCK_TTL_SECONDS",
    "WATCHLIST_ALERT_SCHEDULE_MINUTES",
    "evaluate_all_users_alerts",
    "scheduler_health",
]


async def _reclaim_stale_runs(db: AsyncSession, now: datetime) -> int:
    """Fail out any 'running' row older than the TTL so locks cannot wedge."""
    cutoff = now - timedelta(seconds=WATCHLIST_ALERT_LOCK_TTL_SECONDS)
    result = await db.execute(
        update(WatchlistAlertEvalRun)
        .where(
            WatchlistAlertEvalRun.status == "running",
            WatchlistAlertEvalRun.started_at < cutoff,
        )
        .values(
            status="failed",
            error="Reclaimed stale running run (worker presumed crashed).",
            finished_at=now,
        )
    )
    await db.commit()
    return int(result.rowcount or 0)


async def _active_rule_user_ids(db: AsyncSession) -> list[int]:
    result = await db.execute(
        select(WatchlistAlertRule.user_id)
        .where(WatchlistAlertRule.is_active.is_(True))
        .distinct()
    )
    return [row[0] for row in result.all()]


async def evaluate_all_users_alerts(
    db: AsyncSession,
    trigger: str = "scheduled",
) -> dict[str, Any]:
    """Evaluate every user's active alert rules exactly once per run.

    Returns a summary dict. When a run is already in flight the call returns
    ``status='skipped_locked'`` without touching any rule.
    """
    now = datetime.utcnow()
    reclaimed = await _reclaim_stale_runs(db, now)

    run = WatchlistAlertEvalRun(
        id=str(uuid.uuid4()),
        trigger=trigger,
        status="running",
        started_at=now,
    )
    db.add(run)
    try:
        await db.flush()
        await db.commit()
    except IntegrityError:
        # Another run holds the lock (partial unique index on status='running').
        await db.rollback()
        logger.info("Watchlist alert evaluation skipped: another run is in flight.")
        return {
            "status": "skipped_locked",
            "run_id": None,
            "users_evaluated": 0,
            "rules_evaluated": 0,
            "triggered": 0,
            "unavailable_tickers": 0,
            "reclaimed_stale_runs": reclaimed,
        }

    service = WatchlistAlertService(db)
    try:
        user_ids = await _active_rule_user_ids(db)
        rules_evaluated = 0
        triggered = 0
        unavailable = 0
        for user_id in user_ids:
            summary = await service.evaluate_user_alerts(user_id)
            rules_evaluated += summary["evaluated_rules"]
            triggered += len(summary["triggered"])
            unavailable += len(summary["unavailable_tickers"])

        finished = datetime.utcnow()
        run.status = "success"
        run.finished_at = finished
        run.users_evaluated = len(user_ids)
        run.rules_evaluated = rules_evaluated
        run.triggered = triggered
        run.unavailable_tickers = unavailable
        await db.commit()

        logger.info(
            "Watchlist alert evaluation complete: %d users, %d rules, %d triggered",
            len(user_ids),
            rules_evaluated,
            triggered,
        )
        return {
            "status": "success",
            "run_id": run.id,
            "users_evaluated": len(user_ids),
            "rules_evaluated": rules_evaluated,
            "triggered": triggered,
            "unavailable_tickers": unavailable,
            "reclaimed_stale_runs": reclaimed,
        }
    except Exception as exc:
        logger.exception("Watchlist alert evaluation failed")
        try:
            run.status = "failed"
            run.finished_at = datetime.utcnow()
            run.error = str(exc)[:1000]
            await db.commit()
        except Exception:  # pragma: no cover - best-effort failure recording
            await db.rollback()
        raise


async def scheduler_health(db: AsyncSession) -> dict[str, Any]:
    """Report scheduler state: last run, last success, and recent failures."""
    now = datetime.utcnow()
    latest = (
        await db.execute(
            select(WatchlistAlertEvalRun).order_by(WatchlistAlertEvalRun.started_at.desc()).limit(1)
        )
    ).scalars().first()
    last_success = (
        await db.execute(
            select(WatchlistAlertEvalRun)
            .where(WatchlistAlertEvalRun.status == "success")
            .order_by(WatchlistAlertEvalRun.finished_at.desc())
            .limit(1)
        )
    ).scalars().first()
    running_count = int(
        (
            await db.execute(
                select(func.count(WatchlistAlertEvalRun.id)).where(
                    WatchlistAlertEvalRun.status == "running"
                )
            )
        ).scalar()
        or 0
    )
    failed_24h = int(
        (
            await db.execute(
                select(func.count(WatchlistAlertEvalRun.id)).where(
                    WatchlistAlertEvalRun.status == "failed",
                    WatchlistAlertEvalRun.started_at >= now - timedelta(hours=24),
                )
            )
        ).scalar()
        or 0
    )
    runs_24h = int(
        (
            await db.execute(
                select(func.count(WatchlistAlertEvalRun.id)).where(
                    WatchlistAlertEvalRun.started_at >= now - timedelta(hours=24)
                )
            )
        ).scalar()
        or 0
    )

    return {
        "schedule_minutes": WATCHLIST_ALERT_SCHEDULE_MINUTES,
        "lock_ttl_seconds": WATCHLIST_ALERT_LOCK_TTL_SECONDS,
        "is_running": running_count > 0,
        "runs_last_24h": runs_24h,
        "failures_last_24h": failed_24h,
        "last_run_at": latest.started_at if latest else None,
        "last_run_status": latest.status if latest else None,
        "last_run_error": latest.error if latest else None,
        "last_success_at": last_success.finished_at if last_success else None,
    }

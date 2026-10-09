"""Celery task for scheduled watchlist alert evaluation.

Beat enqueues this every ``WATCHLIST_ALERT_SCHEDULE_MINUTES``; the task opens
its own DB session so it never depends on an in-flight HTTP request. Overlap,
cooldowns and provider outages are handled by the scheduler/service layers;
this wrapper only retries on unexpected failures (e.g. a transient DB outage).
"""

import logging

from app.constants import WATCHLIST_ALERT_SCHEDULE_MINUTES
from app.services.watchlist_alert_scheduler import evaluate_all_users_alerts
from app.workers import _run_async
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def evaluate_watchlist_alerts_task(self) -> dict:
    """Evaluate all persisted watchlist alert rules once.

    Retries up to 3 times with a 60s delay on unexpected errors. Skips (and
    returns ``status='skipped_locked'``) when another run is already in flight.
    """
    from app.database import AsyncSessionLocal

    async def _run() -> dict:
        async with AsyncSessionLocal() as session:
            return await evaluate_all_users_alerts(session, trigger="scheduled")

    try:
        return _run_async(_run())
    except Exception as exc:
        logger.exception("Scheduled watchlist alert evaluation failed; retrying")
        raise self.retry(exc=exc)


__all__ = ["evaluate_watchlist_alerts_task", "WATCHLIST_ALERT_SCHEDULE_MINUTES"]

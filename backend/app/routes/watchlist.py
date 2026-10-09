"""Watchlist intelligence routes.

Mounted at ``/api/v1/profile/watchlist`` *before* the base profile router so
the static sub-paths (``/quotes``, ``/alerts``, ``/atlas-context``) are matched
ahead of the dynamic ``/watchlist/{watchlist_id}`` handler.

Every endpoint is authenticated and scoped to the current user; no route ever
accepts a user id from the client.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.trade import Watchlist
from app.models.user import User
from app.schemas.watchlist import (
    WatchlistAlertEvaluationRead,
    WatchlistAlertEventRead,
    WatchlistAlertRuleCreate,
    WatchlistAlertRuleRead,
    WatchlistAlertRuleUpdate,
    WatchlistAlertSchedulerHealth,
    WatchlistAtlasContext,
    WatchlistEvidenceResponse,
    WatchlistHistoryRead,
    WatchlistQuoteRead,
)
from app.services.auth_service import get_current_user
from app.services.watchlist_alert_scheduler import scheduler_health
from app.services.watchlist_alert_service import WatchlistAlertService
from app.services.watchlist_service import (
    build_atlas_context,
    build_evidence_bundle,
    get_history,
    get_market_for_tickers,
    quote_read_model,
)

# NOTE: this router shares a prefix with ``routes/profile.py``. It is registered
# first in ``app.main`` so ``/quotes`` and ``/alerts`` are resolved before the
# dynamic ``/watchlist/{watchlist_id}`` route.
router = APIRouter(prefix="/profile/watchlist", tags=["watchlist"])


async def _owned_item(db: AsyncSession, user_id: int, watchlist_id: str) -> Watchlist:
    result = await db.execute(
        select(Watchlist).where(
            Watchlist.id == watchlist_id,
            Watchlist.user_id == user_id,
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    return item


# ---------------------------------------------------------------------------
# Market data
# ---------------------------------------------------------------------------


@router.get("/quotes", response_model=list[WatchlistQuoteRead])
async def list_watchlist_quotes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Return every active watchlist item joined with its provider quote.

    Quotes are fetched once per distinct ticker (bounded concurrency) and
    cached by the provider layer. Unavailable symbols return an explicit
    unavailable envelope.
    """
    result = await db.execute(
        select(Watchlist)
        .where(Watchlist.user_id == current_user.id, Watchlist.is_active.is_(True))
        .order_by(Watchlist.created_at.desc())
    )
    items = list(result.scalars().all())
    markets = await get_market_for_tickers([item.ticker for item in items])
    return [quote_read_model(item, markets.get(item.ticker.upper(), {})) for item in items]


@router.get("/atlas-context", response_model=WatchlistAtlasContext)
async def get_watchlist_atlas_context(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Authorized, user-scoped watchlist context for grounded ATLAS answers."""
    result = await db.execute(
        select(Watchlist)
        .where(Watchlist.user_id == current_user.id, Watchlist.is_active.is_(True))
        .order_by(Watchlist.created_at.desc())
    )
    items = list(result.scalars().all())
    return await build_atlas_context(db, items)


# ---------------------------------------------------------------------------
# Alert rules
# ---------------------------------------------------------------------------


@router.get("/alerts", response_model=list[WatchlistAlertRuleRead])
async def list_alert_rules(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await WatchlistAlertService(db).list_rules(current_user.id)


@router.get("/alerts/events", response_model=list[WatchlistAlertEventRead])
async def list_alert_events(
    limit: int = Query(50, ge=1, le=200),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    events = await WatchlistAlertService(db).list_events(current_user.id, limit=limit)
    if unread_only:
        events = [event for event in events if not event.is_read]
    return events


@router.get("/alerts/unread-count")
async def alert_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    count = await WatchlistAlertService(db).unread_event_count(current_user.id)
    return {"count": count}


@router.get("/alerts/scheduler", response_model=WatchlistAlertSchedulerHealth)
async def alert_scheduler_health(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Report whether the scheduled evaluation job is healthy.

    Contains no per-user data, so any authenticated session may read it.
    """
    return await scheduler_health(db)


@router.post("/alerts/events/read-all")
async def mark_all_alert_events_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    marked = await WatchlistAlertService(db).mark_all_events_read(current_user.id)
    return {"marked": marked}


@router.post("/alerts/events/{event_id}/read", response_model=WatchlistAlertEventRead)
async def mark_alert_event_read(
    event_id: str = Path(..., min_length=1, max_length=64),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await WatchlistAlertService(db).mark_event_read(current_user.id, event_id)


@router.post("/alerts/evaluate", response_model=WatchlistAlertEvaluationRead)
async def evaluate_alert_rules(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Evaluate the current user's alert rules against live market data.

    Idempotent within each rule's cooldown: repeated calls do not re-fire the
    same threshold crossing.
    """
    return await WatchlistAlertService(db).evaluate_user_alerts(current_user.id)


@router.post(
    "/alerts",
    response_model=WatchlistAlertRuleRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_alert_rule(
    body: WatchlistAlertRuleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await WatchlistAlertService(db).create_rule(current_user.id, body)


@router.patch("/alerts/{rule_id}", response_model=WatchlistAlertRuleRead)
async def update_alert_rule(
    rule_id: str = Path(..., min_length=1, max_length=64),
    body: WatchlistAlertRuleUpdate = ...,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await WatchlistAlertService(db).update_rule(current_user.id, rule_id, body)


@router.delete("/alerts/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert_rule(
    rule_id: str = Path(..., min_length=1, max_length=64),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await WatchlistAlertService(db).delete_rule(current_user.id, rule_id)


# ---------------------------------------------------------------------------
# Per-item intelligence
# ---------------------------------------------------------------------------


@router.get("/{watchlist_id}/history", response_model=WatchlistHistoryRead)
async def get_watchlist_item_history(
    watchlist_id: str = Path(..., min_length=1, max_length=64),
    interval: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    points: int = Query(30, ge=2, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    item = await _owned_item(db, current_user.id, watchlist_id)
    return await get_history(item, interval=interval, points=points)


@router.get("/{watchlist_id}/evidence", response_model=WatchlistEvidenceResponse)
async def get_watchlist_item_evidence(
    watchlist_id: str = Path(..., min_length=1, max_length=64),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Assemble recorded and candidate geopolitical evidence for one asset.

    The response distinguishes recorded entity links from candidate keyword
    matches and always carries ``causality='not_established'``.
    """
    item = await _owned_item(db, current_user.id, watchlist_id)
    return await build_evidence_bundle(db, item)

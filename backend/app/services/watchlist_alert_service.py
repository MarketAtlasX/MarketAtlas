"""Watchlist alert service — rule CRUD plus provider-backed evaluation.

Design notes
------------
* Evaluation is deterministic and *stateful*: a rule records the last side it
  observed (``last_state``) so an alert fires on a genuine crossing, not on
  every evaluation tick while a threshold stays breached.
* A cooldown plus a persisted ``dedupe_key`` suppress repeated notifications for
  the same crossing, including under concurrent evaluation (the rule row is
  locked with ``SELECT ... FOR UPDATE``).
* If a provider quote is unavailable, the rule is simply not evaluated. The
  service never reports a trigger whose underlying condition could not be
  verified.
* Delivery is in-app only: triggered alerts are persisted with
  ``delivered=False``. External channels (email/push/webhook) are intentionally
  out of scope here; see ``docs`` and the final report.
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event
from app.models.event_entity import EventEntity
from app.models.trade import Watchlist
from app.models.watchlist_alert import WatchlistAlertEvent, WatchlistAlertRule
from app.repositories.entity import EntityRepository
from app.services.watchlist_service import get_market_for_tickers

logger = logging.getLogger(__name__)

EVENT_SEVERITY_RANK = {"low": 1.0, "medium": 4.0, "high": 7.0, "critical": 9.0}


@dataclass
class RuleEvaluation:
    """Outcome of evaluating one rule against one market state."""

    state: Optional[str] = None
    evaluable: bool = True
    reason: Optional[str] = None
    trigger: Optional[dict[str, Any]] = None
    extra: dict[str, Any] = field(default_factory=dict)


def _cooldown_elapsed(rule: WatchlistAlertRule, now: datetime) -> bool:
    if rule.last_triggered_at is None:
        return True
    return now - rule.last_triggered_at >= timedelta(seconds=rule.cooldown_seconds)


def _price_rule(rule: WatchlistAlertRule, market: dict[str, Any], now: datetime) -> RuleEvaluation:
    price = market.get("price")
    if market.get("status") != "provider-backed" or price is None:
        return RuleEvaluation(evaluable=False, reason="no_provider_quote", state=rule.last_state)

    threshold = rule.threshold
    if threshold is None:
        return RuleEvaluation(evaluable=False, reason="missing_threshold", state=rule.last_state)

    state_now = "above" if price >= threshold else "below"
    if rule.direction is not None and rule.direction != state_now:
        return RuleEvaluation(state=state_now)

    crossed = False
    if rule.last_state is not None:
        crossed = rule.last_state != state_now
    else:
        previous_close = market.get("previous_close")
        if previous_close is not None:
            if state_now == "above" and previous_close < threshold:
                crossed = True
            elif state_now == "below" and previous_close > threshold:
                crossed = True

    if not crossed:
        return RuleEvaluation(state=state_now)

    if not _cooldown_elapsed(rule, now):
        return RuleEvaluation(state=state_now, reason="cooldown")

    label = "Target price" if rule.kind == "target_price" else "Stop-loss"
    comparator = "at or above" if state_now == "above" else "at or below"
    return RuleEvaluation(
        state=state_now,
        trigger={
            "direction": state_now,
            "message": f"{label} crossed: {market.get('symbol', '')} {comparator} {threshold}.",
            "observed_price": float(price),
            "threshold": float(threshold),
            "dedupe_key": f"{rule.id}:{rule.kind}:{state_now}",
        },
    )


def _percent_rule(rule: WatchlistAlertRule, market: dict[str, Any], now: datetime) -> RuleEvaluation:
    change_percent = market.get("change_percent")
    if market.get("status") != "provider-backed" or change_percent is None:
        return RuleEvaluation(evaluable=False, reason="no_provider_quote", state=rule.last_state)

    threshold = rule.percent_threshold
    if threshold is None:
        return RuleEvaluation(evaluable=False, reason="missing_threshold", state=rule.last_state)

    if abs(change_percent) < threshold:
        return RuleEvaluation(state="flat")

    state_now = "up" if change_percent > 0 else "down"
    if rule.direction == "above" and state_now != "up":
        return RuleEvaluation(state=state_now)
    if rule.direction == "below" and state_now != "down":
        return RuleEvaluation(state=state_now)

    if rule.last_state == state_now:
        return RuleEvaluation(state=state_now)
    if not _cooldown_elapsed(rule, now):
        return RuleEvaluation(state=state_now, reason="cooldown")

    return RuleEvaluation(
        state=state_now,
        trigger={
            "direction": state_now,
            "message": (
                f"Price movement alert: {market.get('symbol', '')} moved "
                f"{change_percent:+.2f}% (threshold {threshold}%)."
            ),
            "observed_price": float(market.get("price")) if market.get("price") is not None else None,
            "threshold": float(threshold),
            "dedupe_key": f"{rule.id}:percent_move:{state_now}",
        },
    )


def _event_severity_rule(
    rule: WatchlistAlertRule,
    latest_severity: Optional[float],
    now: datetime,
) -> RuleEvaluation:
    if latest_severity is None:
        return RuleEvaluation(evaluable=False, reason="no_recorded_event", state=rule.last_state)
    threshold = rule.threshold
    if threshold is None:
        return RuleEvaluation(evaluable=False, reason="missing_threshold", state=rule.last_state)

    state_now = "above" if latest_severity >= threshold else "below"
    if rule.direction is not None and rule.direction != state_now:
        return RuleEvaluation(state=state_now)

    crossed = rule.last_state != state_now
    if rule.last_state is None:
        # First evaluation only fires when the threshold is already breached.
        crossed = state_now == "above"
    if not crossed:
        return RuleEvaluation(state=state_now)
    if not _cooldown_elapsed(rule, now):
        return RuleEvaluation(state=state_now, reason="cooldown")

    return RuleEvaluation(
        state=state_now,
        trigger={
            "direction": state_now,
            "message": (
                f"High-significance event alert: a recorded event linked to this asset "
                f"reached severity {latest_severity:.1f} (threshold {threshold})."
            ),
            "observed_price": None,
            "threshold": float(threshold),
            "dedupe_key": f"{rule.id}:event_severity:{state_now}",
        },
    )


def evaluate_rule(
    rule: WatchlistAlertRule,
    market: Optional[dict[str, Any]],
    now: datetime,
    latest_event_severity: Optional[float] = None,
) -> RuleEvaluation:
    """Evaluate one rule. Returns an evaluation with an optional trigger."""
    if rule.kind in ("target_price", "stop_loss"):
        if market is None:
            return RuleEvaluation(evaluable=False, reason="no_provider_quote", state=rule.last_state)
        return _price_rule(rule, market, now)
    if rule.kind == "percent_move":
        if market is None:
            return RuleEvaluation(evaluable=False, reason="no_provider_quote", state=rule.last_state)
        return _percent_rule(rule, market, now)
    if rule.kind == "event_severity":
        return _event_severity_rule(rule, latest_event_severity, now)
    return RuleEvaluation(evaluable=False, reason="unknown_kind", state=rule.last_state)


class WatchlistAlertService:
    """Rule CRUD and user-scoped alert evaluation."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # ------------------------------------------------------------------
    # Rule CRUD
    # ------------------------------------------------------------------

    async def _get_owned_item(self, user_id: int, watchlist_id: str) -> Watchlist:
        result = await self._session.execute(
            select(Watchlist).where(
                Watchlist.id == watchlist_id,
                Watchlist.user_id == user_id,
            )
        )
        item = result.scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Watchlist item not found")
        return item

    async def create_rule(self, user_id: int, payload: Any) -> WatchlistAlertRule:
        item = await self._get_owned_item(user_id, payload.watchlist_id)
        rule = WatchlistAlertRule(
            id=str(uuid.uuid4()),
            user_id=user_id,
            watchlist_id=item.id,
            ticker=item.ticker.upper(),
            kind=payload.kind,
            threshold=payload.threshold,
            percent_threshold=payload.percent_threshold,
            direction=payload.direction,
            cooldown_seconds=payload.cooldown_seconds,
            is_active=payload.is_active,
            notes=payload.notes,
        )
        self._session.add(rule)
        await self._session.commit()
        await self._session.refresh(rule)
        return rule

    async def list_rules(self, user_id: int) -> list[WatchlistAlertRule]:
        result = await self._session.execute(
            select(WatchlistAlertRule)
            .where(WatchlistAlertRule.user_id == user_id)
            .order_by(WatchlistAlertRule.created_at.desc())
        )
        return list(result.scalars().all())

    async def _get_owned_rule(self, user_id: int, rule_id: str) -> WatchlistAlertRule:
        result = await self._session.execute(
            select(WatchlistAlertRule).where(
                WatchlistAlertRule.id == rule_id,
                WatchlistAlertRule.user_id == user_id,
            )
        )
        rule = result.scalar_one_or_none()
        if rule is None:
            raise HTTPException(status_code=404, detail="Alert rule not found")
        return rule

    async def update_rule(self, user_id: int, rule_id: str, payload: Any) -> WatchlistAlertRule:
        rule = await self._get_owned_rule(user_id, rule_id)
        update_data = payload.model_dump(exclude_unset=True)
        for field_name, value in update_data.items():
            setattr(rule, field_name, value)
        # A changed threshold invalidates the previously observed side.
        if "threshold" in update_data or "percent_threshold" in update_data:
            rule.last_state = None
        await self._session.commit()
        await self._session.refresh(rule)
        return rule

    async def delete_rule(self, user_id: int, rule_id: str) -> None:
        rule = await self._get_owned_rule(user_id, rule_id)
        await self._session.delete(rule)
        await self._session.commit()

    async def list_events(self, user_id: int, limit: int = 50) -> list[WatchlistAlertEvent]:
        result = await self._session.execute(
            select(WatchlistAlertEvent)
            .where(WatchlistAlertEvent.user_id == user_id)
            .order_by(WatchlistAlertEvent.triggered_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def unread_event_count(self, user_id: int) -> int:
        result = await self._session.execute(
            select(func.count(WatchlistAlertEvent.id)).where(
                WatchlistAlertEvent.user_id == user_id,
                WatchlistAlertEvent.is_read.is_(False),
            )
        )
        return int(result.scalar() or 0)

    async def mark_event_read(self, user_id: int, event_id: str) -> WatchlistAlertEvent:
        """Mark one alert event read. Scoped to the owner (404 otherwise)."""
        result = await self._session.execute(
            select(WatchlistAlertEvent).where(
                WatchlistAlertEvent.id == event_id,
                WatchlistAlertEvent.user_id == user_id,
            )
        )
        event = result.scalar_one_or_none()
        if event is None:
            raise HTTPException(status_code=404, detail="Alert event not found")
        if not event.is_read:
            event.is_read = True
            event.read_at = datetime.utcnow()
            await self._session.commit()
            await self._session.refresh(event)
        return event

    async def mark_all_events_read(self, user_id: int) -> int:
        """Mark every unread alert event for the user read. Returns the count."""
        result = await self._session.execute(
            select(WatchlistAlertEvent).where(
                WatchlistAlertEvent.user_id == user_id,
                WatchlistAlertEvent.is_read.is_(False),
            )
        )
        events = list(result.scalars().all())
        now = datetime.utcnow()
        for event in events:
            event.is_read = True
            event.read_at = now
        await self._session.commit()
        return len(events)

    # ------------------------------------------------------------------
    # Evaluation
    # ------------------------------------------------------------------

    async def _latest_recorded_severity(self, entity_id: int, since: datetime) -> Optional[float]:
        result = await self._session.execute(
            select(Event.severity)
            .join(EventEntity, EventEntity.event_id == Event.id)
            .where(EventEntity.entity_id == entity_id, Event.event_date >= since)
            .order_by(Event.event_date.desc())
            .limit(1)
        )
        severity = result.scalar_one_or_none()
        if severity is None:
            return None
        return EVENT_SEVERITY_RANK.get(str(severity).lower())

    async def evaluate_user_alerts(self, user_id: int) -> dict[str, Any]:
        """Evaluate every active rule for a user and persist new triggers.

        Returns a summary dict shaped for ``WatchlistAlertEvaluationRead``.
        """
        now = datetime.utcnow()

        # Lock rule rows so two concurrent evaluations cannot both fire the same
        # crossing.
        result = await self._session.execute(
            select(WatchlistAlertRule)
            .where(WatchlistAlertRule.user_id == user_id, WatchlistAlertRule.is_active.is_(True))
            .with_for_update()
        )
        rules = list(result.scalars().all())
        if not rules:
            return {
                "evaluated_rules": 0,
                "triggered": [],
                "quotes_checked": 0,
                "unavailable_tickers": [],
                "not_evaluable": [],
                "limitations": [],
            }

        items_result = await self._session.execute(
            select(Watchlist).where(Watchlist.user_id == user_id)
        )
        items = {item.id: item for item in items_result.scalars().all()}
        active_items = [item for item in items.values() if item.is_active]

        markets = await get_market_for_tickers([item.ticker for item in active_items])
        unavailable = sorted(
            {item.ticker.upper() for item in active_items if markets.get(item.ticker.upper(), {}).get("status") != "provider-backed"}
        )

        entity_repo = EntityRepository(self._session)
        severity_cache: dict[str, Optional[float]] = {}
        not_evaluable: list[str] = []
        triggered: list[WatchlistAlertEvent] = []

        for rule in rules:
            item = items.get(rule.watchlist_id)
            if item is None or not item.is_active:
                not_evaluable.append(f"{rule.id}:inactive_or_missing_item")
                continue

            market = markets.get(item.ticker.upper())
            latest_severity: Optional[float] = None
            if rule.kind == "event_severity":
                if item.ticker.upper() not in severity_cache:
                    # Resolve via reviewed aliases/ticker tokens so commodities and
                    # indices map to their entity when one exists.
                    resolution = await entity_repo.resolve_asset(item.ticker)
                    severity_cache[item.ticker.upper()] = (
                        await self._latest_recorded_severity(
                            resolution.entity.id, now - timedelta(days=30)
                        )
                        if resolution.entity is not None
                        else None
                    )
                latest_severity = severity_cache[item.ticker.upper()]

            evaluation = evaluate_rule(rule, market, now, latest_severity)
            if not evaluation.evaluable:
                not_evaluable.append(f"{rule.id}:{evaluation.reason}")
                continue

            if evaluation.state is not None:
                rule.last_state = evaluation.state

            if evaluation.trigger is None:
                continue

            # Defensive second guard against duplicate records.
            existing = await self._session.execute(
                select(WatchlistAlertEvent.id).where(
                    WatchlistAlertEvent.dedupe_key == evaluation.trigger["dedupe_key"],
                    WatchlistAlertEvent.triggered_at
                    >= now - timedelta(seconds=max(rule.cooldown_seconds, 1)),
                )
            )
            if existing.scalar_one_or_none() is not None:
                continue

            event = WatchlistAlertEvent(
                id=str(uuid.uuid4()),
                rule_id=rule.id,
                user_id=user_id,
                watchlist_id=item.id,
                ticker=item.ticker.upper(),
                kind=rule.kind,
                direction=evaluation.trigger["direction"],
                message=evaluation.trigger["message"],
                observed_price=evaluation.trigger["observed_price"],
                threshold=evaluation.trigger["threshold"],
                dedupe_key=evaluation.trigger["dedupe_key"],
                delivered=False,
                triggered_at=now,
            )
            rule.last_triggered_at = now
            self._session.add(event)
            triggered.append(event)

        await self._session.commit()
        for event in triggered:
            await self._session.refresh(event)

        limitations = []
        if unavailable:
            limitations.append("Some symbols had no provider quote and were not evaluated.")
        limitations.append(
            "Alerts are recorded in-app only; no external notification channel is configured."
        )

        return {
            "evaluated_rules": len(rules),
            "triggered": triggered,
            "quotes_checked": len(markets),
            "unavailable_tickers": unavailable,
            "not_evaluable": not_evaluable,
            "limitations": limitations,
        }

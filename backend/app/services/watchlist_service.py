"""Watchlist intelligence service.

Composes *existing* provider-backed data into the watchlist read models:

* market quotes   -> :func:`app.services.financial_data_service.get_stock_quote`
* price history   -> :func:`app.services.financial_data_service.get_price_history`
* event evidence  -> :mod:`app.repositories.entity` + :mod:`app.models.event`
                     plus the live-event store for candidate matches.

No value is ever synthesized. When a provider cannot answer, the result is an
explicit ``unavailable`` envelope with a listed limitation.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.event import Event
from app.models.event_entity import EventEntity
from app.models.trade import Watchlist
from app.repositories.entity import EntityRepository
from app.services.financial_data_service import get_price_history, get_stock_quote
from app.services.live_event_service import LiveEventService

logger = logging.getLogger(__name__)

# Bounded concurrency keeps us inside provider rate limits when a user tracks
# many symbols; quotes are also cached by ``financial_data_service``.
_MAX_CONCURRENT_QUOTES = 5


def unavailable_quote(symbol: str, reason: str) -> dict[str, Any]:
    """Build an explicit unavailable market envelope (never a fabricated price)."""
    return {
        "status": "unavailable",
        "symbol": symbol.upper(),
        "price": None,
        "change": None,
        "change_percent": None,
        "previous_close": None,
        "currency": None,
        "provider": None,
        "observed_at": None,
        "freshness": "unknown",
        "limitations": [reason],
    }


def market_from_quote(symbol: str, quote: Optional[dict[str, Any]]) -> dict[str, Any]:
    """Normalize a provider quote envelope, or return an unavailable envelope."""
    if not quote or quote.get("price") is None:
        return unavailable_quote(symbol, "No provider quote available for this symbol.")
    observed_at = quote.get("observed_at")
    return {
        "status": "provider-backed",
        "symbol": str(quote.get("symbol") or symbol).upper(),
        "price": quote.get("price"),
        "change": quote.get("change"),
        "change_percent": quote.get("change_percent"),
        "previous_close": quote.get("previous_close"),
        "currency": quote.get("currency"),
        "provider": quote.get("source"),
        "observed_at": observed_at,
        "freshness": "current" if observed_at else "unknown",
        "limitations": [],
    }


async def get_market_for_ticker(ticker: str) -> dict[str, Any]:
    """Fetch and normalize one provider quote, degrading to unavailable."""
    try:
        quote = await get_stock_quote(ticker.upper())
    except Exception as exc:  # pragma: no cover - defensive; providers can raise
        logger.warning("watchlist quote fetch failed for %s: %s", ticker, exc)
        return unavailable_quote(ticker, "Market data provider request failed.")
    return market_from_quote(ticker, quote)


async def get_market_for_tickers(tickers: list[str]) -> dict[str, dict[str, Any]]:
    """Fetch quotes for a set of tickers once each, with bounded concurrency."""
    unique = sorted({t.upper() for t in tickers})
    if not unique:
        return {}
    semaphore = asyncio.Semaphore(_MAX_CONCURRENT_QUOTES)

    async def one(symbol: str) -> tuple[str, dict[str, Any]]:
        async with semaphore:
            return symbol, await get_market_for_ticker(symbol)

    results = await asyncio.gather(*(one(symbol) for symbol in unique), return_exceptions=True)
    markets: dict[str, dict[str, Any]] = {}
    for symbol, result in zip(unique, results):
        if isinstance(result, Exception):  # pragma: no cover - defensive
            markets[symbol] = unavailable_quote(symbol, "Market data provider request failed.")
        else:
            markets[result[0]] = result[1]
    return markets


def quote_read_model(item: Watchlist, market: dict[str, Any]) -> dict[str, Any]:
    """Merge a watchlist ORM row with its market envelope for the API schema."""
    return {
        "id": item.id,
        "user_id": item.user_id,
        "ticker": item.ticker,
        "company_name": item.company_name,
        "asset_type": item.asset_type,
        "target_price": item.target_price,
        "stop_loss": item.stop_loss,
        "notes": item.notes,
        "is_active": item.is_active,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
        "market": market,
    }


async def get_history(item: Watchlist, interval: str = "daily", points: int = 30) -> dict[str, Any]:
    """Return a compact provider-backed close series for a sparkline."""
    if interval not in {"daily", "weekly", "monthly"}:
        return {
            "status": "unavailable",
            "symbol": item.ticker.upper(),
            "interval": interval,
            "provider": None,
            "freshness": "unknown",
            "points": [],
            "limitations": ["Unsupported interval."],
        }
    try:
        history = await get_price_history(item.ticker.upper(), interval=interval)
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("watchlist history fetch failed for %s: %s", item.ticker, exc)
        history = None
    if not history:
        return {
            "status": "unavailable",
            "symbol": item.ticker.upper(),
            "interval": interval,
            "provider": None,
            "freshness": "unknown",
            "points": [],
            "limitations": ["No provider-backed history for this symbol."],
        }
    # History is returned newest-first by the provider layer; sparklines read
    # oldest -> newest.
    ordered = list(reversed(history))[-points:]
    return {
        "status": "provider-backed",
        "symbol": item.ticker.upper(),
        "interval": interval,
        "provider": ordered[0].get("provider") if ordered else None,
        "freshness": "historical",
        "points": [{"date": row.get("date"), "close": row.get("close")} for row in ordered],
        "limitations": [],
    }


async def _recorded_events(db: AsyncSession, entity_id: int, limit: int = 20) -> list[Event]:
    """Events linked to the entity through the recorded event_entities junction."""
    query = (
        select(Event)
        .join(EventEntity, EventEntity.event_id == Event.id)
        .where(EventEntity.entity_id == entity_id)
        .options(selectinload(Event.entities))
        .order_by(Event.event_date.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    return list(result.scalars().all())


async def build_evidence_bundle(
    db: AsyncSession,
    item: Watchlist,
    market: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Compose the geopolitical evidence bundle for one watched asset.

    Recorded entity links are treated as a reliable association; live events
    found by keyword are labelled candidate matches. Causality is never
    asserted: the response always carries ``causality='not_established'``.

    ``market`` lets a caller reuse an already-fetched quote so the provider is
    not called twice for the same symbol.
    """
    ticker = item.ticker.upper()
    entity_repo = EntityRepository(db)
    resolution = await entity_repo.resolve_asset(ticker)
    entity = resolution.entity
    resolution_method = resolution.method

    recorded: list[Event] = []
    entity_read: Optional[dict[str, Any]] = None
    if entity is not None:
        recorded = await _recorded_events(db, entity.id)
        entity_read = {
            "id": entity.id,
            "name": entity.name,
            "entity_type": entity.entity_type,
            "country_code": entity.country_code,
            "latitude": entity.latitude,
            "longitude": entity.longitude,
        }

    live_service = LiveEventService(db)
    live_events: list[dict[str, Any]] = []
    live_geography: Optional[dict[str, Any]] = None
    try:
        page = await live_service.search(skip=0, limit=10, keyword=ticker, sort_by="first_seen_at", sort_desc=True)
        for live in page.items:
            impacts = await live_service.get_impacts(live.id)
            affected_assets = [
                {
                    "ticker": asset.ticker,
                    "name": asset.name,
                    "asset_type": asset.asset_type,
                    "price_direction": asset.price_direction,
                    "estimated_move": asset.estimated_move,
                }
                for impact in impacts
                for asset in impact.affected_assets
            ]
            impact_summaries = [
                {
                    "entity_name": impact.entity_name,
                    "impact_direction": impact.impact_direction,
                    "impact_score": impact.impact_score,
                    "confidence": impact.confidence,
                }
                for impact in impacts
            ]
            live_events.append(
                {
                    "id": live.id,
                    "title": live.title,
                    "event_type": live.event_type,
                    "severity": live.severity,
                    "status": live.status,
                    "first_seen_at": live.first_seen_at,
                    "country_code": live.country_code,
                    "region": live.region,
                    "lat": live.lat,
                    "lng": live.lng,
                    "impacts": impact_summaries,
                    "affected_assets": affected_assets,
                }
            )
            if live_geography is None and (live.lat is not None or live.country_code):
                live_geography = {
                    "label": live.region or live.country_code or live.title,
                    "latitude": live.lat,
                    "longitude": live.lng,
                    "country_code": live.country_code,
                    "region": live.region,
                    "source": "live_event",
                }
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("watchlist evidence live-event lookup failed for %s: %s", ticker, exc)

    geography: Optional[dict[str, Any]] = None
    if entity is not None and (entity.latitude is not None or entity.country_code):
        geography = {
            "label": entity.name,
            "latitude": entity.latitude,
            "longitude": entity.longitude,
            "country_code": entity.country_code,
            "region": None,
            "source": "entity",
        }
    elif live_geography is not None:
        geography = live_geography

    methods: list[str] = []
    # How the entity was located (reviewed alias vs exact ticker token). This is
    # a lookup detail, not evidence of a relationship.
    if entity is not None and resolution_method is not None:
        methods.append(resolution_method)
    if recorded:
        methods.append("recorded_entity_link")
    if live_events:
        methods.append("ticker_keyword_match")
    if recorded:
        reliability = "recorded"
    elif live_events:
        reliability = "candidate"
    else:
        reliability = "none"

    uncertainty = [
        "Correlation is not causation: this bundle lists associations, not verified causes of price movement."
    ]
    limitations: list[str] = []
    if entity is None:
        limitations.append(
            "No entity record matches this ticker; only keyword-based candidate events are available."
        )
    if entity is not None and not recorded:
        limitations.append("The matched entity has no recorded event links.")
    if not live_events:
        limitations.append("No live events currently match this ticker.")

    return {
        "ticker": ticker,
        "asset_type": item.asset_type,
        "association_reliability": reliability,
        "association_methods": methods,
        "entity": entity_read,
        "geography": geography,
        "events": [
            {
                "id": event.id,
                "title": event.title,
                "event_type": event.event_type,
                "severity": event.severity,
                "status": event.status,
                "event_date": event.event_date,
                "source": event.source,
                "source_url": event.source_url,
                "association": "recorded_entity_link",
            }
            for event in recorded
        ],
        "live_events": live_events,
        "market": market if market is not None else await get_market_for_ticker(ticker),
        "causality": "not_established",
        "uncertainty": uncertainty,
        "limitations": limitations,
    }


async def build_atlas_context(db: AsyncSession, items: list[Watchlist]) -> dict[str, Any]:
    """Authorized, user-scoped watchlist context for grounded ATLAS answers."""
    markets = await get_market_for_tickers([item.ticker for item in items])

    assets: list[dict[str, Any]] = []
    unavailable_tickers: list[str] = []
    for item in items:
        market = markets.get(item.ticker.upper()) or unavailable_quote(item.ticker, "No provider quote.")
        if market.get("status") != "provider-backed":
            unavailable_tickers.append(item.ticker.upper())
        bundle = await build_evidence_bundle(db, item, market=market)
        assets.append(
            {
                "ticker": item.ticker,
                "company_name": item.company_name,
                "asset_type": item.asset_type,
                "market": market,
                "association_reliability": bundle["association_reliability"],
            }
        )

    movers = sorted(
        (asset for asset in assets if asset["market"].get("change_percent") is not None),
        key=lambda asset: abs(asset["market"]["change_percent"]),
        reverse=True,
    )[:5]

    return {
        "generated_at": datetime.now(timezone.utc),
        "total_tracked": len(items),
        "assets": assets,
        "movers": movers,
        "unavailable_tickers": sorted(unavailable_tickers),
        "causality": "not_established",
        "uncertainty": [
            "Movements are reported from provider data; no causal claim is made about why an asset moved."
        ],
        "limitations": (
            ["Some watched symbols have no provider-backed quote right now."]
            if unavailable_tickers
            else []
        ),
    }

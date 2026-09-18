"""Market data routes — per-sector return/volatility snapshot for the simulator."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.financial_data_service import get_price_history, get_stock_quote
from app.services.sector_data_service import SectorDataService

router = APIRouter(prefix="/market-data", tags=["market-data"])


@router.get("/quote/{ticker}")
async def get_market_quote(ticker: str = Path(..., min_length=1, max_length=20)) -> dict[str, Any]:
    """Return a provider-backed quote envelope; never synthesize a quote."""
    quote = await get_stock_quote(ticker.upper())
    if not quote:
        return {
            "status": "unavailable",
            "symbol": ticker.upper(),
            "price": None,
            "change": None,
            "change_percent": None,
            "currency": None,
            "timestamp": None,
            "provider": None,
            "freshness": "unknown",
        }
    return {
        "status": "provider-backed",
        "symbol": quote.get("symbol", ticker.upper()),
        "price": quote.get("price"),
        "change": quote.get("change"),
        "change_percent": quote.get("change_percent"),
        "currency": quote.get("currency"),
        "timestamp": quote.get("observed_at"),
        "provider": quote.get("source"),
        "freshness": "current" if quote.get("observed_at") else "unknown",
        "volume": quote.get("volume"),
    }


@router.get("/history/{ticker}")
async def get_market_history(
    ticker: str = Path(..., min_length=1, max_length=20),
    interval: str = "daily",
) -> dict[str, Any]:
    """Return provider-backed OHLCV history or an explicit unavailable envelope."""
    if interval not in {"daily", "weekly", "monthly"}:
        return {"status": "unavailable", "symbol": ticker.upper(), "interval": interval, "history": [], "limitations": ["Unsupported interval."]}
    history = await get_price_history(ticker.upper(), interval=interval)
    if not history:
        return {"status": "unavailable", "symbol": ticker.upper(), "interval": interval, "history": [], "provider": None, "freshness": "unknown"}
    return {
        "status": "provider-backed",
        "symbol": ticker.upper(),
        "interval": interval,
        "history": history,
        "provider": history[0].get("provider"),
        "freshness": "historical",
        "timestamp": history[0].get("date"),
    }


@router.get("/sectors")
async def get_sector_snapshot(db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Return the cached per-sector return/volatility snapshot.

    The snapshot is injected into simulator requests by the backend, so the
    simulator never calls this endpoint directly. Returns an empty snapshot
    (with `fallback: true`) when the live feed is unavailable — the simulator
    then falls back to its static sector betas.
    """
    service = SectorDataService(db)
    snapshot = await service.get_snapshot()
    if not snapshot:
        return {"fallback": True, "sectors": {}, "version": 1}
    return snapshot

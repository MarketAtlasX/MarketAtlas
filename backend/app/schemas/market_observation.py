from typing import Any, Literal

from pydantic import BaseModel


class MarketObservation(BaseModel):
    symbol: str
    asset_type: Literal["equity", "index", "commodity", "currency", "unknown"] = "equity"
    price: float | None = None
    change: float | None = None
    change_percent: float | None = None
    timestamp: str | None = None
    provider: str | None = None
    freshness: str = "unknown"
    status: Literal["provider-backed", "cached", "unavailable", "simulated"]
    currency: str | None = None


class MarketHistoryObservation(BaseModel):
    status: Literal["provider-backed", "unavailable"]
    symbol: str
    interval: str
    provider: str | None = None
    freshness: str = "unknown"
    timestamp: str | None = None
    history: list[dict[str, Any]] = []
    limitations: list[str] = []

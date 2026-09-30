"""Market data API response models."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class MarketQuoteResponse:
    """Response model for a single market quote."""
    symbol: str
    price: Optional[float] = None
    change: Optional[float] = None
    change_percent: Optional[float] = None
    currency: str = 'USD'
    timestamp: Optional[str] = None
    provider: Optional[str] = None
    freshness: str = 'unknown'
    status: str = 'unavailable'


@dataclass
class MarketHistoryRow:
    """Single row of historical market data."""
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int
    provider: Optional[str] = None


@dataclass
class MarketHistoryResponse:
    """Response model for historical market data."""
    status: str
    symbol: str
    interval: str = 'daily'
    provider: Optional[str] = None
    freshness: str = 'unknown'
    timestamp: Optional[str] = None
    history: List[MarketHistoryRow] = field(default_factory=list)
    limitations: List[str] = field(default_factory=list)


@dataclass
class SectorSnapshot:
    """Snapshot of a market sector performance."""
    sector: str
    return_pct: float
    volatility: float
    tickers: List[str] = field(default_factory=list)
    status: str = 'unavailable'

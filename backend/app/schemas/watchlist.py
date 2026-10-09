"""Watchlist intelligence schemas.

These extend the base watchlist CRUD contract (``app.schemas.trade``) with the
read models for market data, historical sparklines, geopolitical evidence, and
alert rules. Every market/evidence field is optional: absence means *unknown*,
never zero and never fabricated.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.trade import WatchlistRead

MarketStatus = Literal["provider-backed", "cached", "unavailable"]
AlertKind = Literal["target_price", "stop_loss", "percent_move", "event_severity"]
AlertDirection = Literal["above", "below"]


# ---------------------------------------------------------------------------
# Market data
# ---------------------------------------------------------------------------


class MarketQuoteRead(BaseModel):
    """Provider-backed quote envelope for one watchlist asset.

    ``status='unavailable'`` is a first-class outcome: callers must render an
    explicit unavailable state rather than inferring a price.
    """

    status: MarketStatus = "unavailable"
    symbol: str
    price: Optional[float] = None
    change: Optional[float] = None
    change_percent: Optional[float] = None
    previous_close: Optional[float] = None
    currency: Optional[str] = None
    provider: Optional[str] = None
    observed_at: Optional[datetime] = None
    freshness: str = "unknown"
    limitations: list[str] = Field(default_factory=list)


class WatchlistQuoteRead(WatchlistRead):
    """A watchlist entry joined with its latest provider quote."""

    market: MarketQuoteRead


class WatchlistHistoryPoint(BaseModel):
    date: str
    close: float


class WatchlistHistoryRead(BaseModel):
    status: Literal["provider-backed", "unavailable"]
    symbol: str
    interval: str
    provider: Optional[str] = None
    freshness: str = "unknown"
    points: list[WatchlistHistoryPoint] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Geopolitical evidence association
# ---------------------------------------------------------------------------


class EvidenceEntityRead(BaseModel):
    id: int
    name: str
    entity_type: str
    country_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class WatchlistEvidenceEvent(BaseModel):
    """A normalized event with a *recorded* entity link to the asset."""

    id: int
    title: str
    event_type: str
    severity: str
    status: str
    event_date: datetime
    source: Optional[str] = None
    source_url: Optional[str] = None
    association: Literal["recorded_entity_link"] = "recorded_entity_link"


class WatchlistEvidenceLiveEvent(BaseModel):
    """A live event surfaced by a keyword match on the ticker (candidate link)."""

    id: str
    title: str
    event_type: str
    severity: float
    status: str
    first_seen_at: datetime
    country_code: Optional[str] = None
    region: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    impacts: list[dict] = Field(default_factory=list)
    affected_assets: list[dict] = Field(default_factory=list)
    association: Literal["ticker_keyword_match"] = "ticker_keyword_match"


class WatchlistGeography(BaseModel):
    label: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    country_code: Optional[str] = None
    region: Optional[str] = None
    source: Literal["entity", "live_event"]


class WatchlistEvidenceResponse(BaseModel):
    """Evidence bundle for one watched asset.

    The ``causality`` field is always ``"not_established"``: this endpoint
    surfaces recorded links and candidate matches, but never asserts that a
    geopolitical event *caused* a price move.
    """

    ticker: str
    asset_type: str
    association_reliability: Literal["recorded", "candidate", "none"]
    association_methods: list[str] = Field(default_factory=list)
    entity: Optional[EvidenceEntityRead] = None
    geography: Optional[WatchlistGeography] = None
    events: list[WatchlistEvidenceEvent] = Field(default_factory=list)
    live_events: list[WatchlistEvidenceLiveEvent] = Field(default_factory=list)
    market: Optional[MarketQuoteRead] = None
    causality: Literal["not_established"] = "not_established"
    uncertainty: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------


class WatchlistAlertRuleBase(BaseModel):
    kind: AlertKind
    threshold: Optional[float] = Field(default=None, ge=0, le=1e12)
    percent_threshold: Optional[float] = Field(default=None, gt=0, le=100)
    direction: Optional[AlertDirection] = None
    cooldown_seconds: int = Field(default=900, ge=0, le=86_400)
    is_active: bool = True
    notes: Optional[str] = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def _require_fields_for_kind(self) -> "WatchlistAlertRuleBase":
        if self.kind == "percent_move":
            if self.percent_threshold is None:
                raise ValueError("percent_move rules require percent_threshold")
        elif self.threshold is None:
            raise ValueError(f"{self.kind} rules require threshold")
        return self


class WatchlistAlertRuleCreate(WatchlistAlertRuleBase):
    watchlist_id: str


class WatchlistAlertRuleUpdate(BaseModel):
    threshold: Optional[float] = Field(default=None, ge=0, le=1e12)
    percent_threshold: Optional[float] = Field(default=None, gt=0, le=100)
    direction: Optional[AlertDirection] = None
    cooldown_seconds: Optional[int] = Field(default=None, ge=0, le=86_400)
    is_active: Optional[bool] = None
    notes: Optional[str] = Field(default=None, max_length=500)


class WatchlistAlertRuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: int
    watchlist_id: str
    ticker: str
    kind: str
    threshold: Optional[float] = None
    percent_threshold: Optional[float] = None
    direction: Optional[str] = None
    cooldown_seconds: int
    is_active: bool
    last_state: Optional[str] = None
    last_triggered_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class WatchlistAlertEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    rule_id: str
    user_id: int
    watchlist_id: str
    ticker: str
    kind: str
    direction: Optional[str] = None
    message: str
    observed_price: Optional[float] = None
    threshold: Optional[float] = None
    delivered: bool
    is_read: bool
    read_at: Optional[datetime] = None
    dedupe_key: str
    triggered_at: datetime


class WatchlistAlertSchedulerHealth(BaseModel):
    """Observable state of the scheduled alert-evaluation job."""

    schedule_minutes: int
    lock_ttl_seconds: int
    is_running: bool
    runs_last_24h: int
    failures_last_24h: int
    last_run_at: Optional[datetime] = None
    last_run_status: Optional[str] = None
    last_run_error: Optional[str] = None
    last_success_at: Optional[datetime] = None


class WatchlistAlertEvaluationRead(BaseModel):
    evaluated_rules: int
    triggered: list[WatchlistAlertEventRead] = Field(default_factory=list)
    quotes_checked: int = 0
    unavailable_tickers: list[str] = Field(default_factory=list)
    not_evaluable: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# ATLAS briefing context
# ---------------------------------------------------------------------------


class WatchlistAtlasAsset(BaseModel):
    ticker: str
    company_name: Optional[str] = None
    asset_type: str
    market: MarketQuoteRead
    association_reliability: Literal["recorded", "candidate", "none"]


class WatchlistAtlasContext(BaseModel):
    """Authorized, user-scoped context for grounded ATLAS watchlist answers."""

    generated_at: datetime
    total_tracked: int
    assets: list[WatchlistAtlasAsset] = Field(default_factory=list)
    movers: list[WatchlistAtlasAsset] = Field(default_factory=list)
    unavailable_tickers: list[str] = Field(default_factory=list)
    causality: Literal["not_established"] = "not_established"
    uncertainty: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)

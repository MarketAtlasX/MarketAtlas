from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from app.schemas.market_observation import MarketObservation

ObservationStatus = Literal["live", "stale", "degraded", "unavailable", "demo"]


class ObservationSource(BaseModel):
    reference: str | None = None
    url: str | None = None
    title: str | None = None
    provider: str | None = None
    published_at: str | None = None
    fetched_at: str | None = None
    relevance: float | None = None


class ObservationProvenance(BaseModel):
    provider: str | None = None
    observed_at: str | None = None
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    references: list[str] = Field(default_factory=list)


class EvidenceObservation(BaseModel):
    """Canonical read-only evidence envelope consumed by Atlas and the UI."""

    status: ObservationStatus
    query: str | None = None
    freshness: str = "unknown"
    event: dict[str, Any] | None = None
    entities: list[str] = Field(default_factory=list)
    countries: list[str] = Field(default_factory=list)
    assets: list[str] = Field(default_factory=list)
    impacts: list[dict[str, Any]] = Field(default_factory=list)
    sources: list[ObservationSource] = Field(default_factory=list)
    market_observations: list[MarketObservation] = Field(default_factory=list)
    causal_chain: list[dict[str, Any]] = Field(default_factory=list)
    provenance: ObservationProvenance = Field(default_factory=ObservationProvenance)
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    uncertainty: list[str] = Field(default_factory=list)
    provider_status: dict[str, ObservationStatus] = Field(default_factory=dict)
    limitations: list[str] = Field(default_factory=list)

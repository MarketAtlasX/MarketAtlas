from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field

from world_state.core.types import (
    COMPANY_STATE_KEYS,
    MultiScaleState,
    StateVector,
)


class CompanyState(BaseModel):
    name: str
    sector: Optional[str] = None
    country: Optional[str] = None
    operational_risk: float = 0.0
    financial_risk: float = 0.0
    reputational_risk: float = 0.0
    regulatory_risk: float = 0.0
    supply_chain_exposure: float = 0.0
    market_position: float = 0.5
    revenue_momentum: float = 0.5
    cost_pressure: float = 0.0
    sentiment_score: float = 0.0
    volatility: float = 0.0
    confidence: float = 0.5
    last_updated: Optional[datetime] = None
    last_event_id: Optional[str] = None
    last_event_title: Optional[str] = None

    multi_scale: MultiScaleState = Field(default_factory=MultiScaleState)

    def update(self, key: str, delta: float, confidence: float = 0.5) -> None:
        if hasattr(self, key):
            current = getattr(self, key)
            setattr(self, key, current + delta)
        self.confidence = (self.confidence + confidence) / 2

    def to_vector(self) -> StateVector:
        sv = StateVector()
        for key in COMPANY_STATE_KEYS:
            raw = getattr(self, key, 0.0)
            if isinstance(raw, (int, float)):
                sv.set(key, raw, self.confidence)
        return sv

    def model_dump(self, **kwargs: Any) -> Dict[str, Any]:
        return {
            "name": self.name,
            "sector": self.sector,
            "country": self.country,
            "operational_risk": self.operational_risk,
            "financial_risk": self.financial_risk,
            "reputational_risk": self.reputational_risk,
            "regulatory_risk": self.regulatory_risk,
            "supply_chain_exposure": self.supply_chain_exposure,
            "market_position": self.market_position,
            "revenue_momentum": self.revenue_momentum,
            "cost_pressure": self.cost_pressure,
            "sentiment_score": self.sentiment_score,
            "volatility": self.volatility,
            "confidence": self.confidence,
            "multi_scale": self.multi_scale.to_dict() if self.multi_scale else {},
        }

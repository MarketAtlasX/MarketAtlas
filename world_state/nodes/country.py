from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field

from world_state.core.types import (
    COUNTRY_STATE_KEYS,
    EconomicState,
    GeopoliticalState,
    InfrastructureState,
    MarketState,
    MultiScaleState,
    StateVector,
)


class CountryState(BaseModel):
    name: str
    geopolitical_risk: float = 0.0
    military_activity: float = 0.0
    economic_strength: float = 0.5
    inflation: float = 0.0
    oil_production: float = 0.5
    export_capacity: float = 0.5
    political_stability: float = 0.5
    cyber_risk: float = 0.0
    sanctions: float = 0.0
    diplomacy: float = 0.5
    shipping: float = 0.5
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
        for key in COUNTRY_STATE_KEYS:
            raw = getattr(self, key, 0.0)
            if isinstance(raw, (int, float)):
                sv.set(key, raw, self.confidence)
        sv.set("geopolitical_risk", self.geopolitical_risk, self.confidence)
        sv.set("military_activity", self.military_activity, self.confidence)
        sv.set("economic_strength", self.economic_strength, self.confidence)
        sv.set("inflation", self.inflation, self.confidence)
        sv.set("oil_production", self.oil_production, self.confidence)
        sv.set("export_capacity", self.export_capacity, self.confidence)
        sv.set("political_stability", self.political_stability, self.confidence)
        sv.set("cyber_risk", self.cyber_risk, self.confidence)
        sv.set("sanctions", self.sanctions, self.confidence)
        sv.set("diplomacy", self.diplomacy, self.confidence)
        sv.set("shipping", self.shipping, self.confidence)
        sv.set("confidence", self.confidence, self.confidence)
        return sv

    def model_dump(self, **kwargs: Any) -> Dict[str, Any]:
        return {
            "name": self.name,
            "geopolitical_risk": self.geopolitical_risk,
            "military_activity": self.military_activity,
            "economic_strength": self.economic_strength,
            "inflation": self.inflation,
            "oil_production": self.oil_production,
            "export_capacity": self.export_capacity,
            "political_stability": self.political_stability,
            "cyber_risk": self.cyber_risk,
            "sanctions": self.sanctions,
            "diplomacy": self.diplomacy,
            "shipping": self.shipping,
            "confidence": self.confidence,
            "multi_scale": self.multi_scale.to_dict() if self.multi_scale else {},
        }

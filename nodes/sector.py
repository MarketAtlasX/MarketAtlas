from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from world_state.core.types import (
    SECTOR_STATE_KEYS,
    MultiScaleState,
    StateVector,
)


class SectorState(BaseModel):
    name: str
    companies: List[str] = Field(default_factory=list)
    sector_risk: float = 0.0
    regulatory_pressure: float = 0.0
    supply_chain_disruption: float = 0.0
    labor_market_tightness: float = 0.0
    technology_disruption: float = 0.0
    demand_shift: float = 0.0
    commodity_input_cost: float = 0.0
    market_sentiment: float = 0.0
    volatility: float = 0.0
    growth_outlook: float = 0.5
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
        for key in SECTOR_STATE_KEYS:
            raw = getattr(self, key, 0.0)
            if isinstance(raw, (int, float)):
                sv.set(key, raw, self.confidence)
        return sv

    def model_dump(self, **kwargs: Any) -> Dict[str, Any]:
        return {
            "name": self.name,
            "companies": self.companies,
            "sector_risk": self.sector_risk,
            "regulatory_pressure": self.regulatory_pressure,
            "supply_chain_disruption": self.supply_chain_disruption,
            "labor_market_tightness": self.labor_market_tightness,
            "technology_disruption": self.technology_disruption,
            "demand_shift": self.demand_shift,
            "commodity_input_cost": self.commodity_input_cost,
            "market_sentiment": self.market_sentiment,
            "volatility": self.volatility,
            "growth_outlook": self.growth_outlook,
            "confidence": self.confidence,
            "multi_scale": self.multi_scale.to_dict() if self.multi_scale else {},
        }

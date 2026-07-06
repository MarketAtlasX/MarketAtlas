from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from world_state.core.types import (
    REGION_STATE_KEYS,
    MultiScaleState,
    StateVector,
)


class RegionState(BaseModel):
    name: str
    countries: List[str] = Field(default_factory=list)
    avg_military_risk: float = 0.0
    avg_political_risk: float = 0.0
    avg_economic_risk: float = 0.0
    avg_inflation: float = 0.0
    trade_tension: float = 0.0
    regional_conflict_level: float = 0.0
    energy_dependency: float = 0.5
    supply_chain_risk: float = 0.0
    migration_pressure: float = 0.0
    climate_vulnerability: float = 0.0
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
        for key in REGION_STATE_KEYS:
            raw = getattr(self, key, 0.0)
            if isinstance(raw, (int, float)):
                sv.set(key, raw, self.confidence)
        return sv

    def model_dump(self, **kwargs: Any) -> Dict[str, Any]:
        return {
            "name": self.name,
            "countries": self.countries,
            "avg_military_risk": self.avg_military_risk,
            "avg_political_risk": self.avg_political_risk,
            "avg_economic_risk": self.avg_economic_risk,
            "avg_inflation": self.avg_inflation,
            "trade_tension": self.trade_tension,
            "regional_conflict_level": self.regional_conflict_level,
            "energy_dependency": self.energy_dependency,
            "supply_chain_risk": self.supply_chain_risk,
            "migration_pressure": self.migration_pressure,
            "climate_vulnerability": self.climate_vulnerability,
            "confidence": self.confidence,
            "multi_scale": self.multi_scale.to_dict() if self.multi_scale else {},
        }

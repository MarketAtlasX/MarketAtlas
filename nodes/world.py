from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field

from world_state.core.types import (
    WORLD_STATE_KEYS,
    EconomicState,
    GeopoliticalState,
    InfrastructureState,
    MarketState,
    MultiScaleState,
    StateVector,
)


class WorldState(BaseModel):
    global_conflict_index: float = 0.0
    global_economic_index: float = 0.5
    global_trade_volume: float = 0.5
    global_inflation_pressure: float = 0.0
    global_energy_price_index: float = 0.5
    global_food_price_index: float = 0.5
    global_cyber_risk: float = 0.0
    global_pandemic_risk: float = 0.0
    global_climate_risk: float = 0.0
    global_market_sentiment: float = 0.0
    global_volatility: float = 0.0
    global_confidence: float = 0.5
    last_updated: Optional[datetime] = None
    last_event_id: Optional[str] = None
    last_event_title: Optional[str] = None

    multi_scale: MultiScaleState = Field(default_factory=MultiScaleState)

    def update(self, key: str, delta: float, confidence: float = 0.5) -> None:
        if hasattr(self, key):
            current = getattr(self, key)
            setattr(self, key, current + delta)
        self.global_confidence = (self.global_confidence + confidence) / 2

    def to_vector(self) -> StateVector:
        sv = StateVector()
        for key in WORLD_STATE_KEYS:
            raw = getattr(self, key, 0.0)
            if isinstance(raw, (int, float)):
                sv.set(key, raw, self.global_confidence)
        return sv

    def model_dump(self, **kwargs: Any) -> Dict[str, Any]:
        return {
            "global_conflict_index": self.global_conflict_index,
            "global_economic_index": self.global_economic_index,
            "global_trade_volume": self.global_trade_volume,
            "global_inflation_pressure": self.global_inflation_pressure,
            "global_energy_price_index": self.global_energy_price_index,
            "global_food_price_index": self.global_food_price_index,
            "global_cyber_risk": self.global_cyber_risk,
            "global_pandemic_risk": self.global_pandemic_risk,
            "global_climate_risk": self.global_climate_risk,
            "global_market_sentiment": self.global_market_sentiment,
            "global_volatility": self.global_volatility,
            "global_confidence": self.global_confidence,
            "multi_scale": self.multi_scale.to_dict() if self.multi_scale else {},
        }

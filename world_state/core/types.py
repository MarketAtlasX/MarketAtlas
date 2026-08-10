from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

import numpy as np
from pydantic import BaseModel, Field


class NodeType(str, Enum):
    WORLD = "world"
    REGION = "region"
    COUNTRY = "country"
    SECTOR = "sector"
    COMPANY = "company"
    COMMODITY = "commodity"
    MARKET = "market"


class ConfidenceValue(BaseModel):
    value: float = 0.0
    confidence: float = 1.0

    @property
    def weighted(self) -> float:
        return self.value * self.confidence

    def merge(self, other: ConfidenceValue, weight: float = 0.5) -> ConfidenceValue:
        alpha = weight * other.confidence
        beta = (1 - weight) * self.confidence
        total = alpha + beta
        if total == 0:
            return ConfidenceValue(value=0.0, confidence=0.0)
        return ConfidenceValue(
            value=(alpha * other.value + beta * self.value) / total,
            confidence=total / 2,
        )


class StateVector(BaseModel):
    values: Dict[str, ConfidenceValue] = Field(default_factory=dict)

    def get(self, key: str, default: float = 0.0) -> float:
        cv = self.values.get(key)
        return cv.value if cv else default

    def set(self, key: str, value: float, confidence: float = 1.0) -> None:
        self.values[key] = ConfidenceValue(value=value, confidence=confidence)

    def update(self, key: str, delta: float, confidence: float = 0.5) -> None:
        cv = self.values.get(key)
        if cv:
            new_val = cv.value + delta
            new_conf = (cv.confidence + confidence) / 2
            self.values[key] = ConfidenceValue(value=new_val, confidence=new_conf)
        else:
            self.values[key] = ConfidenceValue(value=delta, confidence=confidence)

    def to_array(self, keys: Optional[List[str]] = None) -> np.ndarray:
        if keys:
            return np.array([self.values.get(k, ConfidenceValue()).value for k in keys])
        return np.array([cv.value for cv in self.values.values()])

    def to_confident_array(self, keys: Optional[List[str]] = None) -> np.ndarray:
        if keys:
            return np.array([self.values.get(k, ConfidenceValue()).weighted for k in keys])
        return np.array([cv.weighted for cv in self.values.values()])

    def clone(self) -> StateVector:
        return StateVector(values={k: v.model_copy() for k, v in self.values.items()})

    @property
    def keys(self) -> List[str]:
        return list(self.values.keys())

    @property
    def avg_confidence(self) -> float:
        if not self.values:
            return 1.0
        return float(np.mean([cv.confidence for cv in self.values.values()]))

    def model_dump(self, **kwargs: Any) -> Dict[str, Any]:
        return {
            k: {"value": v.value, "confidence": v.confidence}
            for k, v in sorted(self.values.items())
        }


COUNTRY_STATE_KEYS = [
    "military_risk",
    "political_risk",
    "economic_risk",
    "inflation",
    "interest_rate",
    "unemployment",
    "currency_strength",
    "export_strength",
    "import_dependency",
    "oil_production",
    "gas_production",
    "food_security",
    "cyber_risk",
    "diplomatic_activity",
    "sanctions",
    "protests",
    "conflict_level",
    "shipping_activity",
    "aviation_activity",
    "climate_risk",
    "market_sentiment",
    "commodity_pressure",
    "volatility",
    "confidence",
    "geopolitical_risk",
    "military_activity",
    "economic_strength",
    "political_stability",
]

REGION_STATE_KEYS = [
    "avg_military_risk",
    "avg_political_risk",
    "avg_economic_risk",
    "avg_inflation",
    "trade_tension",
    "regional_conflict_level",
    "energy_dependency",
    "supply_chain_risk",
    "migration_pressure",
    "climate_vulnerability",
]

WORLD_STATE_KEYS = [
    "global_conflict_index",
    "global_economic_index",
    "global_trade_volume",
    "global_inflation_pressure",
    "global_energy_price_index",
    "global_food_price_index",
    "global_cyber_risk",
    "global_pandemic_risk",
    "global_climate_risk",
    "global_market_sentiment",
    "global_volatility",
    "global_confidence",
]

SECTOR_STATE_KEYS = [
    "sector_risk",
    "regulatory_pressure",
    "supply_chain_disruption",
    "labor_market_tightness",
    "technology_disruption",
    "demand_shift",
    "commodity_input_cost",
    "market_sentiment",
    "volatility",
    "growth_outlook",
]

COMPANY_STATE_KEYS = [
    "operational_risk",
    "financial_risk",
    "reputational_risk",
    "regulatory_risk",
    "supply_chain_exposure",
    "market_position",
    "revenue_momentum",
    "cost_pressure",
    "sentiment_score",
    "volatility",
]


class GeopoliticalState(BaseModel):
    military_activity: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.0, confidence=0.5))
    conflict_level: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.0, confidence=0.5))
    diplomatic_activity: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.0, confidence=0.5))
    sanctions: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.0, confidence=0.5))
    protests: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.0, confidence=0.5))
    cyber_risk: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.0, confidence=0.5))
    political_stability: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.5, confidence=0.5))
    shipping_activity: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.5, confidence=0.5))

    def to_vector(self) -> StateVector:
        sv = StateVector()
        for name, field in self.model_dump().items():
            sv.set(name, field["value"], field["confidence"])
        return sv


class EconomicState(BaseModel):
    inflation: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.0, confidence=0.5))
    interest_rate: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.0, confidence=0.5))
    unemployment: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.0, confidence=0.5))
    currency_strength: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.5, confidence=0.5))
    export_strength: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.5, confidence=0.5))
    import_dependency: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.5, confidence=0.5))
    oil_production: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.5, confidence=0.5))
    gas_production: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.5, confidence=0.5))
    food_security: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.5, confidence=0.5))
    economic_strength: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.5, confidence=0.5))

    def to_vector(self) -> StateVector:
        sv = StateVector()
        for name, field in self.model_dump().items():
            sv.set(name, field["value"], field["confidence"])
        return sv


class MarketState(BaseModel):
    market_sentiment: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.0, confidence=0.5))
    commodity_pressure: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.0, confidence=0.5))
    volatility: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.0, confidence=0.5))
    confidence: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.5, confidence=0.5))
    risk_appetite: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.5, confidence=0.5))
    liquidity: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.5, confidence=0.5))

    def to_vector(self) -> StateVector:
        sv = StateVector()
        for name, field in self.model_dump().items():
            sv.set(name, field["value"], field["confidence"])
        return sv


class InfrastructureState(BaseModel):
    shipping_activity: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.5, confidence=0.5))
    aviation_activity: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.5, confidence=0.5))
    energy_network_risk: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.0, confidence=0.5))
    supply_chain_risk: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.0, confidence=0.5))
    climate_risk: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.0, confidence=0.5))
    cyber_infrastructure_risk: ConfidenceValue = Field(default_factory=lambda: ConfidenceValue(value=0.0, confidence=0.5))

    def to_vector(self) -> StateVector:
        sv = StateVector()
        for name, field in self.model_dump().items():
            sv.set(name, field["value"], field["confidence"])
        return sv


class MultiScaleState(BaseModel):
    geopolitical: GeopoliticalState = Field(default_factory=GeopoliticalState)
    economic: EconomicState = Field(default_factory=EconomicState)
    market: MarketState = Field(default_factory=MarketState)
    infrastructure: InfrastructureState = Field(default_factory=InfrastructureState)

    def to_vector(self) -> StateVector:
        combined = StateVector()
        for sub in [self.geopolitical, self.economic, self.market, self.infrastructure]:
            for name, field in sub.model_dump().items():
                combined.set(name, field["value"], field["confidence"])
        return combined

    def to_dict(self) -> Dict[str, Dict[str, float]]:
        return {
            "geopolitical": {k: v["value"] for k, v in self.geopolitical.model_dump().items()},
            "economic": {k: v["value"] for k, v in self.economic.model_dump().items()},
            "market": {k: v["value"] for k, v in self.market.model_dump().items()},
            "infrastructure": {k: v["value"] for k, v in self.infrastructure.model_dump().items()},
        }


class StateDelta(BaseModel):
    node_id: str
    node_type: NodeType
    updates: Dict[str, float] = Field(default_factory=dict)
    confidence: float = 0.5
    source_event_id: Optional[str] = None
    source_event_title: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class Snapshot(BaseModel):
    snapshot_id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    node_id: str
    node_type: NodeType
    state_vector: Dict[str, Dict[str, float]]
    multi_scale: Optional[Dict[str, Dict[str, float]]] = None
    risk_scores: Dict[str, float] = Field(default_factory=dict)
    confidence: float = 1.0


class WorldSnapshot(BaseModel):
    snapshot_id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    world_state: Dict[str, Dict[str, float]]
    country_states: Dict[str, Dict[str, Dict[str, float]]] = Field(default_factory=dict)
    region_states: Dict[str, Dict[str, Dict[str, float]]] = Field(default_factory=dict)
    risk_scores: Dict[str, float] = Field(default_factory=dict)
    market_state: Dict[str, float] = Field(default_factory=dict)
    confidence: float = 1.0
    event_count: int = 0

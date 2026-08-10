"""DashboardState — data models for the Dynamic World State dashboard."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from world_state.core.registry import StateRegistry
from world_state.core.types import NodeType, WorldSnapshot
from world_state.risk.engine import WorldRiskEngine
from world_state.temporal.memory import TemporalMemory


class CountryDashboard(BaseModel):
    id: str
    name: str
    risk_score: float = 0.0
    risk_level: str = "low"
    geopolitical_risk: float = 0.0
    economic_risk: float = 0.0
    military_activity: float = 0.0
    sanctions: float = 0.0
    confidence: float = 0.5


class RegionDashboard(BaseModel):
    id: str
    name: str
    avg_risk: float = 0.0
    risk_level: str = "low"
    country_count: int = 0
    avg_conflict: float = 0.0


class RiskGauge(BaseModel):
    composite: float = 0.0
    geopolitical: float = 0.0
    economic: float = 0.0
    market: float = 0.0
    infrastructure: float = 0.0
    level: str = "low"


class DashboardState(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    version: int = 0
    global_risk: RiskGauge = Field(default_factory=RiskGauge)
    countries: List[CountryDashboard] = Field(default_factory=list)
    regions: List[RegionDashboard] = Field(default_factory=list)
    active_events: int = 0
    prediction: Optional[Dict[str, float]] = None
    world_snapshot: Optional[Dict[str, Any]] = None

    @classmethod
    def from_registry(cls, registry: StateRegistry) -> DashboardState:
        engine = WorldRiskEngine(registry)
        global_risk_data = engine.compute_global_risk()

        countries = []
        for cid, country in registry.countries.items():
            cr = engine.compute_country_risk(cid)
            countries.append(CountryDashboard(
                id=cid,
                name=country.name,
                risk_score=cr.get("composite_risk", 0),
                risk_level=cr.get("level", "low"),
                geopolitical_risk=cr.get("geopolitical_risk", 0),
                economic_risk=cr.get("economic_risk", 0),
                military_activity=country.military_activity,
                sanctions=country.sanctions,
                confidence=country.confidence,
            ))

        regions_map: Dict[str, dict] = {}
        for cid, country in registry.countries.items():
            from world_state.pipeline.propagate import COUNTRY_TO_REGION
            region = COUNTRY_TO_REGION.get(cid, "other")
            if region not in regions_map:
                regions_map[region] = {"countries": [], "risks": []}
            regions_map[region]["countries"].append(cid)
            cr = engine.compute_country_risk(cid)
            regions_map[region]["risks"].append(cr.get("composite_risk", 0))

        regions = []
        for rid, data in regions_map.items():
            avg_r = sum(data["risks"]) / max(len(data["risks"]), 1)
            regions.append(RegionDashboard(
                id=rid,
                name=rid.replace("_", " ").title(),
                avg_risk=avg_r,
                risk_level=engine._risk_level(avg_r),
                country_count=len(data["countries"]),
                avg_conflict=avg_r * 0.7,
            ))

        memory = TemporalMemory()
        snapshots = registry.get_world_snapshots(limit=10)
        for snap in snapshots:
            memory.add_snapshot(snap)

        prediction = None
        next_pred = memory.predict_next()
        if next_pred is not None:
            from world_state.core.types import WORLD_STATE_KEYS
            prediction = {}
            for i, key in enumerate(WORLD_STATE_KEYS):
                if i < len(next_pred):
                    prediction[key] = round(float(next_pred[i]), 4)

        return cls(
            version=registry.summary()["version"],
            global_risk=RiskGauge(
                composite=global_risk_data.get("composite_risk", 0),
                geopolitical=global_risk_data.get("geopolitical_risk", 0),
                economic=global_risk_data.get("economic_risk", 0),
                market=global_risk_data.get("market_risk", 0),
                infrastructure=global_risk_data.get("infrastructure_risk", 0),
                level=global_risk_data.get("level", "low"),
            ),
            countries=sorted(countries, key=lambda c: c.risk_score, reverse=True)[:50],
            regions=regions,
            active_events=registry.summary()["events_processed"],
            prediction=prediction,
            world_snapshot=registry.world.to_vector().model_dump(),
        )

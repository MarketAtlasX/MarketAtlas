"""FastAPI server for the Dynamic World State — serves data to the frontend."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from world_state.core.registry import StateRegistry
from world_state.core.types import NodeType, StateDelta
from world_state.dashboard.models import DashboardState
from world_state.pipeline.extract import EventExtractor
from world_state.pipeline.propagate import RiskPropagator
from world_state.risk.engine import WorldRiskEngine
from world_state.risk.aggregator import RiskAggregator
from world_state.temporal.memory import TemporalMemory

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Dynamic World State API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

registry = StateRegistry()


@app.get("/health")
def health():
    return {"service": "world_state", "status": "ok", "version": registry.summary()["version"]}


@app.get("/api/world-state/summary")
def get_summary():
    return registry.summary()


@app.get("/api/world-state/dashboard")
def get_dashboard():
    dash = DashboardState.from_registry(registry)
    return dash.model_dump()


@app.get("/api/world-state/global-risk")
def get_global_risk():
    engine = WorldRiskEngine(registry)
    return engine.compute_global_risk()


@app.get("/api/world-state/countries")
def get_countries():
    engine = WorldRiskEngine(registry)
    results = []
    for cid, country in registry.countries.items():
        cr = engine.compute_country_risk(cid)
        sv = country.to_vector()
        results.append({
            "id": cid,
            "name": country.name,
            "risk_score": cr.get("composite_risk", 0),
            "risk_level": cr.get("level", "low"),
            "military_activity": country.military_activity,
            "geopolitical_risk": cr.get("geopolitical_risk", 0),
            "economic_risk": cr.get("economic_risk", 0),
            "confidence": country.confidence,
            "state_vector": sv.model_dump(),
        })
    return {"countries": sorted(results, key=lambda x: x["risk_score"], reverse=True)}


@app.get("/api/world-state/country/{country_id}")
def get_country(country_id: str):
    engine = WorldRiskEngine(registry)
    cr = engine.compute_country_risk(country_id)
    country = registry.countries.get(country_id)
    if not country:
        return {"error": f"Country '{country_id}' not found"}
    sv = country.to_vector()
    return {
        **cr,
        "state_vector": sv.model_dump(),
        "last_event_title": country.last_event_title,
    }


@app.get("/api/world-state/regions")
def get_regions():
    agg = RiskAggregator(registry)
    return {"regions": agg.aggregate_by_region()}


@app.get("/api/world-state/snapshots")
def get_snapshots(limit: int = Query(100, ge=1, le=1000)):
    return {
        "snapshots": [
            {
                "snapshot_id": s.snapshot_id,
                "timestamp": s.timestamp.isoformat(),
                "world_state": {k: v.get("value", 0) for k, v in s.world_state.items()},
                "confidence": s.confidence,
            }
            for s in registry.get_world_snapshots(limit=limit)
        ]
    }


@app.post("/api/world-state/ingest")
def ingest_event(event: Dict[str, Any]):
    extractor = EventExtractor()
    propagator = RiskPropagator()

    deltas = extractor.extract(event)
    all_deltas = list(deltas)
    for delta in deltas:
        registry.apply_delta(delta)
        propagated = propagator.propagate(delta)
        for p in propagated:
            registry.apply_delta(p)
            all_deltas.append(p)

    registry.take_world_snapshot()

    return {
        "deltas_applied": len(all_deltas),
        "registry": registry.summary(),
    }


@app.get("/api/world-state/prediction")
def get_prediction():
    memory = TemporalMemory()
    snapshots = registry.get_world_snapshots(limit=30)
    for snap in snapshots:
        memory.add_snapshot(snap)
    pred = memory.predict_next()
    if pred is None:
        return {"prediction": None, "message": "Not enough data"}
    from world_state.core.types import WORLD_STATE_KEYS
    return {
        "prediction": {
            key: round(float(pred[i]), 4)
            for i, key in enumerate(WORLD_STATE_KEYS)
            if i < len(pred)
        }
    }


@app.get("/api/world-state/forecast")
def get_forecast(steps: int = Query(5, ge=1, le=30)):
    memory = TemporalMemory()
    snapshots = registry.get_world_snapshots(limit=30)
    for snap in snapshots:
        memory.add_snapshot(snap)
    forecast = memory.forecast(steps=steps)
    if not forecast:
        return {"forecast": []}
    from world_state.core.types import WORLD_STATE_KEYS
    return {
        "forecast": [
            {
                "step": i + 1,
                "state": {
                    key: round(float(vec[j]), 4)
                    for j, key in enumerate(WORLD_STATE_KEYS)
                    if j < len(vec)
                },
            }
            for i, vec in enumerate(forecast)
        ]
    }


@app.post("/api/world-state/seed")
def seed_demo_data():
    demo_events = [
        {
            "title": "Iran blocks Strait of Hormuz",
            "content": "Iran has blocked the Strait of Hormuz amid rising tensions, disrupting global oil supply.",
            "source": "reuters",
        },
        {
            "title": "Russia launches offensive in Ukraine",
            "content": "Russia has launched a major military offensive in eastern Ukraine, escalating the conflict.",
            "source": "reuters",
        },
        {
            "title": "China imposes tech export restrictions",
            "content": "China has imposed new export restrictions on rare earth minerals and semiconductor materials.",
            "source": "bloomberg",
        },
        {
            "title": "OPEC announces production cut",
            "content": "OPEC has announced a surprise production cut of 1.5 million barrels per day.",
            "source": "reuters",
        },
        {
            "title": "US Federal Reserve raises interest rates",
            "content": "The Federal Reserve has raised interest rates by 25 basis points to combat inflation.",
            "source": "bloomberg",
        },
    ]

    extractor = EventExtractor()
    propagator = RiskPropagator()
    total = 0

    for evt in demo_events:
        deltas = extractor.extract(evt)
        for d in deltas:
            registry.apply_delta(d)
            for p in propagator.propagate(d):
                registry.apply_delta(p)
                total += 1
            total += 1
        registry.take_world_snapshot()

    return {
        "events_ingested": len(demo_events),
        "total_deltas": total,
        "registry": registry.summary(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)

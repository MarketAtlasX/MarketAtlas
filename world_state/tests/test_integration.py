"""Integration tests for the Dynamic World State system."""

import asyncio
from datetime import datetime

from pipelines.core.types import Context, Event, PipelineType
from world_state.core.registry import StateRegistry
from world_state.core.types import NodeType, StateDelta
from world_state.dashboard.models import DashboardState
from world_state.pipeline.extract import EventExtractor
from world_state.pipeline.propagate import RiskPropagator
from world_state.pipeline.update import StateUpdateStage
from world_state.risk.engine import WorldRiskEngine
from world_state.risk.aggregator import RiskAggregator
from world_state.temporal.memory import TemporalMemory


def test_registry_basic():
    StateRegistry.reset()
    reg = StateRegistry()

    assert reg.summary()["version"] == 0
    assert reg.summary()["countries"] == 0

    delta = StateDelta(
        node_id="iran",
        node_type=NodeType.COUNTRY,
        updates={"military_activity": 0.15, "shipping": -0.30, "oil_production": -0.20},
        confidence=0.7,
        source_event_id="evt_001",
        source_event_title="Iran blocks Strait of Hormuz",
    )
    reg.apply_delta(delta)

    assert reg.summary()["version"] == 1
    assert reg.summary()["countries"] == 1
    assert reg.summary()["events_processed"] == 1

    iran = reg.get_country("iran")
    assert iran.military_activity == 0.15
    assert iran.shipping == 0.20
    assert iran.oil_production == 0.30
    assert iran.last_event_title == "Iran blocks Strait of Hormuz"

    sv = reg.get_state_vector("iran", NodeType.COUNTRY)
    assert sv is not None
    assert sv.get("military_activity") == 0.15

    snap = reg.take_world_snapshot()
    assert snap is not None
    assert "iran" in snap.country_states

    StateRegistry.reset()


def test_extraction():
    StateRegistry.reset()
    extractor = EventExtractor()

    event = {
        "id": "evt_002",
        "title": "Russia launches massive cyber attack on Ukraine energy grid",
        "content": "Russia has launched a major cyber attack targeting Ukraine power infrastructure. The attack disrupts energy supply across multiple regions.",
        "source": "reuters",
    }

    deltas = extractor.extract(event)
    assert len(deltas) >= 5

    country_deltas = [d for d in deltas if d.node_type == NodeType.COUNTRY]
    assert len(country_deltas) >= 1
    assert country_deltas[0].node_id in ("russia", "ukraine")

    sector_deltas = [d for d in deltas if d.node_type == NodeType.SECTOR]
    sector_names = [d.node_id for d in sector_deltas]
    assert "energy" in sector_names

    world_deltas = [d for d in deltas if d.node_type == NodeType.WORLD]
    assert len(world_deltas) == 1

    StateRegistry.reset()


def test_propagation():
    StateRegistry.reset()
    reg = StateRegistry()
    prop = RiskPropagator()

    delta = StateDelta(
        node_id="russia",
        node_type=NodeType.COUNTRY,
        updates={"military_activity": 0.2, "oil_production": -0.15},
        confidence=0.7,
    )
    reg.apply_delta(delta)
    propagated = prop.propagate(delta)
    assert len(propagated) >= 1

    region_deltas = [d for d in propagated if d.node_type == NodeType.REGION]
    commodity_deltas = [d for d in propagated if d.node_type == NodeType.COMMODITY]
    assert len(region_deltas) >= 1
    assert len(commodity_deltas) >= 1

    for p in propagated:
        reg.apply_delta(p)

    commodity_delta = StateDelta(
        node_id="oil",
        node_type=NodeType.COMMODITY,
        updates={"supply_risk": 0.25, "price_pressure": 0.2},
        confidence=0.6,
    )
    reg.apply_delta(commodity_delta)
    propagated2 = prop.propagate(commodity_delta)
    sector_deltas = [d for d in propagated2 if d.node_type == NodeType.SECTOR]
    assert len(sector_deltas) >= 1
    assert "energy" in [d.node_id for d in sector_deltas]

    StateRegistry.reset()


def test_risk_engine():
    StateRegistry.reset()
    reg = StateRegistry()

    reg.apply_delta(StateDelta(
        node_id="iran",
        node_type=NodeType.COUNTRY,
        updates={"military_activity": 0.4, "geopolitical_risk": 0.5, "political_stability": -0.3},
        confidence=0.7,
    ))
    reg.apply_delta(StateDelta(
        node_id="russia",
        node_type=NodeType.COUNTRY,
        updates={"military_activity": 0.3, "geopolitical_risk": 0.4, "political_stability": -0.2},
        confidence=0.7,
    ))

    engine = WorldRiskEngine(reg)
    global_risk = engine.compute_global_risk()
    assert "composite_risk" in global_risk
    assert "geopolitical_risk" in global_risk
    assert "level" in global_risk

    iran_risk = engine.compute_country_risk("iran")
    assert iran_risk["composite_risk"] > 0

    all_countries = engine.compute_all_country_risks()
    assert len(all_countries) == 2

    summary = engine.risk_summary()
    assert "global" in summary
    assert "top_risks" in summary

    engine2 = WorldRiskEngine(reg)
    risk2 = engine2.compute_global_risk()
    assert risk2["level"] in ("low", "moderate", "high", "critical")

    StateRegistry.reset()


def test_aggregator():
    StateRegistry.reset()
    reg = StateRegistry()

    reg.apply_delta(StateDelta(
        node_id="iran", node_type=NodeType.COUNTRY,
        updates={"military_activity": 0.4, "geopolitical_risk": 0.5},
        confidence=0.7,
    ))
    reg.apply_delta(StateDelta(
        node_id="russia", node_type=NodeType.COUNTRY,
        updates={"military_activity": 0.3, "geopolitical_risk": 0.4},
        confidence=0.7,
    ))
    reg.apply_delta(StateDelta(
        node_id="energy", node_type=NodeType.SECTOR,
        updates={"sector_risk": 0.3},
        confidence=0.6,
    ))

    agg = RiskAggregator(reg)
    by_region = agg.aggregate_by_region()
    assert len(by_region) >= 1

    world_agg = agg.aggregate_countries_to_world()
    assert "world_aggregate_risk" in world_agg
    assert world_agg["countries_assessed"] == 2

    full = agg.full_aggregation()
    assert "global" in full
    assert "regions" in full
    assert "sectors" in full

    StateRegistry.reset()


def test_dashboard():
    StateRegistry.reset()
    reg = StateRegistry()

    for i in range(5):
        reg.apply_delta(StateDelta(
            node_id=f"country_{i}", node_type=NodeType.COUNTRY,
            updates={"military_activity": 0.1 * i, "geopolitical_risk": 0.05 * i},
            confidence=0.5,
        ))
        reg.take_world_snapshot()

    dash = DashboardState.from_registry(reg)
    assert dash.version >= 5
    assert len(dash.countries) == 5
    assert dash.active_events == 5
    assert dash.global_risk.level in ("low", "moderate", "high", "critical")

    StateRegistry.reset()


def test_temporal_memory():
    StateRegistry.reset()
    reg = StateRegistry()
    mem = TemporalMemory()

    for i in range(40):
        reg.world.global_conflict_index = i * 0.01
        reg.world.global_market_sentiment = -i * 0.005
        snap = reg.take_world_snapshot()
        mem.add_snapshot(snap)

    assert mem.get_state()["sequence_length"] == 40
    pred = mem.predict_next()
    assert pred is not None
    assert len(pred) == 12

    forecast = mem.forecast(steps=3)
    assert len(forecast) == 3

    training_result = mem.train(reg.get_world_snapshots(limit=40), epochs=20, learning_rate=0.01)
    assert "final_loss" in training_result
    assert mem.get_state()["trained"] is True

    StateRegistry.reset()


def test_full_pipeline():
    import asyncio

    async def run():
        StateRegistry.reset()
        stage = StateUpdateStage()

        pipeline_event = Event(
            source="reuters",
            type="news",
            data={
                "id": "evt_003",
                "title": "Iran blocks Strait of Hormuz, oil prices surge",
                "content": "Iran has blocked the Strait of Hormuz amid rising tensions. This cuts off about 20 percent of global oil supply. Military vessels deployed to the region. Global markets reacting sharply.",
                "source": "reuters",
            },
        )

        ctx = Context(pipeline="test", pipeline_type=PipelineType.WORLD_STATE)
        result = await stage.run(pipeline_event, ctx)

        ws_update = result.data.get("world_state_update", {})
        assert ws_update.get("deltas_applied", 0) > 0

        reg = stage.registry
        assert reg.summary()["countries"] >= 1

        iran = reg.get_country("iran")
        assert iran.military_activity >= 0.0

        engine = WorldRiskEngine(reg)
        global_risk = engine.compute_global_risk()
        assert global_risk["composite_risk"] >= 0

        dash = DashboardState.from_registry(reg)
        assert len(dash.countries) >= 1

        return True

    assert asyncio.run(run())
    StateRegistry.reset()


if __name__ == "__main__":
    test_registry_basic()
    print("  registry_basic OK")
    test_extraction()
    print("  extraction OK")
    test_propagation()
    print("  propagation OK")
    test_risk_engine()
    print("  risk_engine OK")
    test_aggregator()
    print("  aggregator OK")
    test_dashboard()
    print("  dashboard OK")
    test_temporal_memory()
    print("  temporal_memory OK")
    test_full_pipeline()
    print("  full_pipeline OK")
    print("\nAll Dynamic World State tests PASSED!")

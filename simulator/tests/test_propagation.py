from __future__ import annotations

from simulator.models.propagation import InfluenceEdge, PropagationPath, RiskDelta
from simulator.propagation_engine.graph import KnowledgeGraphTraverser
from simulator.propagation_engine.propagator import RiskPropagator


def test_graph_traversal():
    traverser = KnowledgeGraphTraverser(max_depth=5, decay=0.85)
    traverser.load_graph(
        nodes=[
            {"id": "Taiwan", "type": "country"},
            {"id": "TSMC", "type": "company"},
            {"id": "Semiconductors", "type": "sector"},
            {"id": "NASDAQ", "type": "market"},
        ],
        edges=[
            {"source": "Taiwan", "target": "TSMC", "weight": 0.9, "type": "produces"},
            {"source": "TSMC", "target": "Semiconductors", "weight": 0.95, "type": "supplies"},
            {"source": "Semiconductors", "target": "NASDAQ", "weight": 0.7, "type": "impacts"},
        ],
    )

    paths = traverser.find_paths("Taiwan", "NASDAQ")
    assert len(paths) > 0
    assert paths[0].nodes == ["Taiwan", "TSMC", "Semiconductors", "NASDAQ"]


def test_influence_edge():
    edge = InfluenceEdge(
        source="Oil",
        target="NASDAQ",
        weight=0.5,
        relationship_type="impacts",
        lag_days=45,
    )
    assert edge.weight == 0.5
    assert edge.lag_days == 45


def test_risk_delta():
    delta = RiskDelta(
        entity_id="NASDAQ",
        delta_value=-0.12,
        source="TaiwanBlockade",
        propagation_path=["Taiwan", "TSMC", "Semiconductors", "NASDAQ"],
        confidence=0.75,
    )
    assert delta.entity_id == "NASDAQ"
    assert delta.delta_value == -0.12
    assert len(delta.propagation_path) == 4


def test_propagator():
    propagator = RiskPropagator()
    propagator.build_default_graph()
    deltas = propagator.propagate("Taiwan", 0.8, {})
    assert len(deltas) > 0
    for d in deltas:
        assert len(d.propagation_path) >= 2
        assert 0.0 <= d.confidence <= 1.0

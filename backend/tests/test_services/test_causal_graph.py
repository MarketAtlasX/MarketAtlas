"""Tests for CausalGraphService and reasoning chain generation."""

from app.services.causal_graph_service import CausalGraphService


def test_causal_graph_nvda():
    service = CausalGraphService()
    graph = service.build_causal_graph("NVDA")
    assert graph["ticker"] == "NVDA"
    assert len(graph["nodes"]) >= 4
    assert len(graph["edges"]) >= 3

    types = [n["type"] for n in graph["nodes"]]
    assert "geopolitical_risk" in types
    assert "company_hq" in types
    assert "supply_chain" in types

    edge_tones = [e["tone"] for e in graph["edges"]]
    assert "red" in edge_tones or "gold" in edge_tones


def test_causal_graph_fallback():
    service = CausalGraphService()
    graph = service.build_causal_graph("CUSTOM_ASSET")
    assert graph["ticker"] == "CUSTOM_ASSET"
    assert len(graph["nodes"]) >= 3
    assert len(graph["edges"]) >= 2

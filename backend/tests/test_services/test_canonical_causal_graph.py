from datetime import datetime, timezone
from types import SimpleNamespace

from app.services.canonical_causal_graph import CanonicalCausalGraphService


def test_build_preserves_evidence_classes_and_multi_hop_chain():
    asset = SimpleNamespace(
        id="asset-1",
        ticker="NVDA",
        name="NVIDIA",
        asset_type="equity",
        current_price=None,
    )
    impact = SimpleNamespace(
        id="impact-1",
        entity_id=7,
        entity_name="TSMC",
        entity_type="company",
        impact_type="supply_risk",
        confidence=0.74,
        generated_by="event-impact-model",
        created_at=datetime(2026, 9, 14, tzinfo=timezone.utc),
        affected_assets=[asset],
    )
    event = SimpleNamespace(
        id="event-1",
        title="Taiwan Strait event",
        country_code="TW",
        region=None,
        lat=23.7,
        lng=120.9,
        source="GDELT",
        confidence=0.91,
        updated_at=datetime(2026, 9, 14, tzinfo=timezone.utc),
        event_date=None,
        news_articles=[],
        impacts=[impact],
    )

    graph = CanonicalCausalGraphService().build([event], ticker="NVDA")

    assert graph["status"] == "supported"
    assert {node["type"] for node in graph["nodes"]} == {"event", "geography", "company", "equity"}
    assert len(graph["edges"]) == 3
    assert graph["edges"][0]["provenance"] == "direct_evidence"
    assert graph["edges"][1]["provenance"] == "model_inference"
    assert graph["edges"][2]["provenance"] == "derived_relationship"
    assert all(edge["evidence_reference"] for edge in graph["edges"])


def test_build_reports_insufficient_evidence_without_fabrication():
    graph = CanonicalCausalGraphService().build([], ticker="UNKNOWN")

    assert graph["status"] == "insufficient_evidence"
    assert graph["nodes"] == []
    assert graph["edges"] == []
    assert graph["limitations"]

"""Tests for API dataclass models serialization and defaults."""
from app.models.market_responses import MarketQuoteResponse
from app.models.prediction_responses import PredictionScenario, PredictionSummaryResponse
from app.models.causal_graph_models import CausalNode, CausalEdge


def test_quote_response_model():
    quote = MarketQuoteResponse(
        symbol="NVDA",
        price=120.50,
        change=2.50,
        change_percent=2.12,
        currency="USD",
        provider="simulated",
    )
    assert quote.symbol == "NVDA"
    assert quote.price == 120.50


def test_prediction_models():
    scenario = PredictionScenario(
        label="Bull Case",
        target_price=145.0,
        confidence=0.75,
        horizon="30d",
        drivers=["AI accelerator demand growth"],
    )
    assert scenario.confidence == 0.75

    summary = PredictionSummaryResponse(
        ticker="NVDA",
        horizon="30d",
        confidence=0.82,
        primary_scenario=scenario,
    )
    assert summary.ticker == "NVDA"


def test_causal_models():
    node = CausalNode(
        id="geo-1",
        label="Hormuz Strait",
        node_type="geopolitical_risk",
        risk_level=0.75,
    )
    edge = CausalEdge(
        source="geo-1",
        target="xom-hq",
        relationship="CRUDE_DISRUPTION",
        confidence=0.88,
    )
    assert node.risk_level == 0.75
    assert edge.confidence == 0.88

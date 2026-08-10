from market_agents.impact import impact_agent
from market_agents.impact.impact_agent import ImpactAgent
from market_agents.recommendation.recommendation_agent import RecommendationAgent


def test_impact_pipeline_uses_best_effort_fetches(monkeypatch):
    monkeypatch.setattr(impact_agent, "fetch_gdelt_events", lambda query="conflict": {"query": query, "total": 1})
    monkeypatch.setattr(impact_agent, "fetch_acled_events", lambda: {"acled_reachable": True})
    monkeypatch.setattr(impact_agent, "fetch_eia_data", lambda series_id: {"series_id": series_id, "values": [0.0, 0.1]})

    agent = ImpactAgent()
    state = {"text": "CountryA launched a strike on FactoryB. CountryC faces sanctions."}

    state = agent.ingest(state)
    assert state["gdelt"]["total"] == 1
    assert state["acled"]["acled_reachable"] is True
    assert state["eia"]["series_id"] == "TOTAL.STOCKS"

    state = agent.extract(state)
    assert state["entities"]
    assert state["relations"]

    state = agent.store(state)
    state = agent.propagate(state)
    state = agent.output(state)

    assert state["local_severity"] > 0
    assert state["composite_risk"] > 0
    assert "CountryA" in state["graph_summary"]


def test_recommendation_agent_actions():
    agent = RecommendationAgent()

    assert agent.decide({"composite_risk": 0.8}, {"momentum": -0.1, "volatility": 0.01}) == {
        "action": "SELL",
        "reason": "high_impact_negative_momentum",
    }
    assert agent.decide({"composite_risk": 0.2}, {"momentum": 0.1, "volatility": 0.01}) == {
        "action": "BUY",
        "reason": "low_impact_positive_momentum",
    }
    assert agent.decide({"composite_risk": 0.2}, {"momentum": 0.1, "volatility": 0.2}) == {
        "action": "HOLD",
        "reason": "high_volatility",
    }
    assert agent.decide({"composite_risk": 0.5}, {"momentum": -0.2, "volatility": 0.01}) == {
        "action": "HOLD",
        "reason": "hedge_negative_momentum",
    }
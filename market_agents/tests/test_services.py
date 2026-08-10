from fastapi.testclient import TestClient

from market_agents.services.impact_service import app as impact_app
from market_agents.services.market_service import app as market_app
from market_agents.services.recommendation_service import app as recommendation_app


def test_market_service_health_metrics_and_snapshot():
    client = TestClient(market_app)

    assert client.get("/health").json()["status"] == "ok"
    result = client.post(
        "/snapshot",
        json={
            "prices": [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114],
            "volumes": [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 160],
        },
    )
    assert result.status_code == 200
    assert result.json()["volume"] == "surge"
    assert "marketatlas_http_requests_total" in client.get("/metrics").text


def test_impact_service_pipeline(monkeypatch):
    from market_agents.impact import impact_agent

    monkeypatch.setattr(impact_agent, "fetch_gdelt_events", lambda query="conflict": {"query": query, "total": 1})
    monkeypatch.setattr(impact_agent, "fetch_acled_events", lambda: {"acled_reachable": True})
    monkeypatch.setattr(impact_agent, "fetch_eia_data", lambda series_id: {"series_id": series_id, "values": [0.0]})

    client = TestClient(impact_app)
    result = client.post("/impact", json={"text": "CountryA launched a strike on FactoryB."})

    assert result.status_code == 200
    payload = result.json()
    assert payload["local_severity"] > 0
    assert payload["relations"]


def test_recommendation_service_decision():
    client = TestClient(recommendation_app)
    result = client.post(
        "/recommendation",
        json={"impact": {"composite_risk": 0.8}, "market": {"momentum": -0.1, "volatility": 0.01}},
    )

    assert result.status_code == 200
    assert result.json()["action"] == "SELL"

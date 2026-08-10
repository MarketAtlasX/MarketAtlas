from fastapi.testclient import TestClient

from market_agents.services import gateway


def test_gateway_analyze_orchestrates_downstream_services(monkeypatch):
    def fake_post_json(url, payload, breaker):
        if url.endswith("/snapshot"):
            return {"momentum": 0.14, "volatility": 0.001, "volume": "surge"}
        if url.endswith("/impact"):
            return {
                "local_severity": 0.2,
                "composite_risk": 0.2,
                "graph_summary": {"CountryA": {"severity": 0.2}},
                "relations": [["CountryA", "attacked", "FactoryB"]],
            }
        if url.endswith("/recommendation"):
            return {"action": "BUY", "reason": "low_impact_positive_momentum"}
        raise AssertionError(f"unexpected url: {url}")

    monkeypatch.setattr(gateway, "_post_json", fake_post_json)
    client = TestClient(gateway.app)

    result = client.post(
        "/analyze",
        json={
            "text": "CountryA launched a strike on FactoryB.",
            "prices": [100, 101, 102],
            "volumes": [100, 100, 160],
        },
    )

    assert result.status_code == 200
    payload = result.json()
    assert payload["snapshot"]["volume"] == "surge"
    assert payload["recommendation"]["action"] == "BUY"

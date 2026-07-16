"""Smoke tests for the Graph Engine service."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from graph_engine.main import app

client = TestClient(app)


class TestGraphEngine:
    def test_health(self):
        resp = client.get("/api/graph/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["service"] == "graph_engine"

    def test_forecast_graph(self):
        resp = client.get("/api/graph/forecast?symbol=AAPL&company_name=Apple&current_price=200")
        assert resp.status_code == 200
        data = resp.json()
        assert data["graph_type"] == "forecast"
        assert "forecast" in data["data"]
        assert "graph" in data["data"]

    def test_causal_graph(self):
        resp = client.get("/api/graph/causal?root_event=Iran%20Conflict&target_asset=NVIDIA&max_paths=3")
        assert resp.status_code == 200
        data = resp.json()
        assert data["graph_type"] == "causal"
        assert "root_event" in data["data"]
        assert "paths" in data["data"]
        assert len(data["data"]["paths"]) > 0

    def test_reasoning_graph(self):
        resp = client.get("/api/graph/reasoning?target=NVIDIA")
        assert resp.status_code == 200
        data = resp.json()
        assert data["graph_type"] == "reasoning"
        assert "agents" in data["data"]
        assert len(data["data"]["agents"]) == 10

    def test_confidence_graph(self):
        resp = client.get("/api/graph/confidence?target=NVIDIA&prediction_value=900&prediction_direction=bullish")
        assert resp.status_code == 200
        data = resp.json()
        assert data["graph_type"] == "confidence"
        assert "overall_confidence" in data["data"]
        assert len(data["data"]["factors"]) == 5

    def test_all_graphs(self):
        resp = client.get("/api/graph/all?symbol=AAPL&company_name=Apple&current_price=200&root_event=China&target_asset=Apple")
        assert resp.status_code == 200
        data = resp.json()
        assert data["graph_type"] == "all"
        assert "forecast" in data["data"]
        assert "causal" in data["data"]
        assert "reasoning" in data["data"]
        assert "confidence" in data["data"]

    def test_causal_path_integrity(self):
        resp = client.get("/api/graph/causal?root_event=Iran%20Conflict&target_asset=NVIDIA&max_paths=5")
        data = resp.json()
        path = data["data"]["paths"][0]
        assert len(path["nodes"]) >= 2  # at least source + target
        assert len(path["edges"]) >= 1  # at least one connection
        assert path["strength"] > 0

    def test_confidence_factor_descriptions(self):
        resp = client.get("/api/graph/confidence?target=AAPL")
        data = resp.json()
        for factor in data["data"]["factors"]:
            assert factor["name"]
            assert factor["value"] > 0
            assert factor["description"]

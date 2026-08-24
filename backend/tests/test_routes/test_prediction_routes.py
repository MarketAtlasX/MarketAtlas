"""Integration Tests for 3-Agent Prediction API Endpoints."""

import asyncio
from pathlib import Path
import sys
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

# Ensure paths
_ROOT = Path(__file__).resolve().parents[3]
_BACKEND = Path(__file__).resolve().parents[2]
for _p in [str(_ROOT), str(_BACKEND)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from fastapi.testclient import TestClient
from app.database import get_db
from app.main import app


class TestPredictionRoutes(unittest.TestCase):
    """Test REST prediction endpoints with FastAPI TestClient."""

    def setUp(self):
        # Override get_db with mock session
        self.mock_db = AsyncMock()
        async def override_get_db():
            yield self.mock_db

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_post_predict_endpoint(self):
        """Test POST /api/v1/predict with valid payload."""
        payload = {
            "target": "Semiconductor trade policy and advanced foundry demand",
            "ticker": "NVDA",
            "time_horizon": "medium_term",
            "include_raw_agent_outputs": True,
        }
        response = self.client.post("/api/v1/predict", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("prediction_id", data)
        self.assertEqual(data["ticker"], "NVDA")
        self.assertIn("direction", data)
        self.assertIn("confidence", data)
        self.assertTrue(len(data["alternative_scenarios"]) >= 4)
        self.assertIsNotNone(data["historical_output"])
        self.assertIsNotNone(data["geopolitical_output"])

    def test_get_predict_ticker_endpoint(self):
        """Test GET /api/v1/predict/ticker/{ticker}."""
        response = self.client.get("/api/v1/predict/ticker/XOM?time_horizon=short_term")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["ticker"], "XOM")
        self.assertIn("prediction", data)
        self.assertIn("direction", data)
        self.assertTrue(len(data["alternative_scenarios"]) >= 1)

    def test_get_predict_entity_not_found(self):
        """Test GET /api/v1/predict/entity/99999 returns 404 when entity absent."""
        self.mock_db.get = AsyncMock(return_value=None)
        response = self.client.get("/api/v1/predict/entity/99999")
        self.assertEqual(response.status_code, 404)

    def test_post_predict_event_not_found(self):
        """Test POST /api/v1/predict/event/99999 returns 404 when event absent."""
        self.mock_db.get = AsyncMock(return_value=None)
        response = self.client.post("/api/v1/predict/event/99999")
        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()

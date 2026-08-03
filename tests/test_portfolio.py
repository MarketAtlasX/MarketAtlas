"""Tests for the portfolio impact engine, report integration, and API routes."""

from datetime import datetime, timedelta

from fastapi.testclient import TestClient

from simulator.api.schemas import PortfolioImpactRequest, RunSimulationRequest
from simulator.main import app
from simulator.models.scenario import (
    AssumptionGraph,
    EventType,
    InjectedEvent,
    Scenario,
)
from simulator.portfolio_engine.impact import DEFAULT_ALLOCATION, PortfolioImpactEngine

client = TestClient(app)


def _make_scenario():
    return Scenario(
        id="scenario-test",
        title="Rate Hike",
        description="Central bank raises rates 50bp",
        assumptions=AssumptionGraph(),
        injected_events=[
            InjectedEvent(
                event_type=EventType.DEFAULT,
                title="Rate hike",
                description="Central bank rate hike",
                countries=["US"],
                severity=0.5,
            )
        ],
        start_time=datetime.utcnow(),
        duration=timedelta(days=365),
    )


class TestPortfolioImpactEngine:
    def test_default_allocation_used_when_none(self):
        engine = PortfolioImpactEngine()
        result = engine.calculate_impact(_make_scenario(), horizon_days=90)
        assert "total_portfolio_impact" in result
        assert "sector_contributions" in result
        assert set(result["sector_contributions"].keys()) == set(DEFAULT_ALLOCATION.keys())

    def test_canonical_summary_shape(self):
        engine = PortfolioImpactEngine()
        result = engine.calculate_impact(_make_scenario(), horizon_days=90)
        assert "summary" in result
        assert isinstance(result["impacts"], list)
        assert len(result["impacts"]) == len(result["sector_contributions"])
        assert all(i["name"].startswith("sector_") for i in result["impacts"])
        assert "risks" in result and "opportunities" in result

    def test_sector_data_blends_live_metrics(self):
        engine = PortfolioImpactEngine()
        sector_data = {
            "technology": {"return_pct": 10.0, "volatility": 30.0},
            "energy": {"return_pct": -20.0, "volatility": 40.0},
        }
        with_data = engine.calculate_impact(
            _make_scenario(), horizon_days=90, portfolio_allocation={"technology": 1.0},
            sector_data=sector_data,
        )
        without = engine.calculate_impact(
            _make_scenario(), horizon_days=90, portfolio_allocation={"technology": 1.0},
        )
        tech_with = with_data["sector_contributions"]["technology"]
        assert "return_pct" in tech_with and "volatility" in tech_with
        assert tech_with["sector_impact"] != without["sector_contributions"]["technology"][
            "sector_impact"
        ]

    def test_contribution_math(self):
        engine = PortfolioImpactEngine()
        result = engine.calculate_impact(
            _make_scenario(),
            horizon_days=90,
            portfolio_allocation={"technology": 0.4, "bonds": 0.6},
        )
        total = sum(c["contribution"] for c in result["sector_contributions"].values())
        assert abs(total - result["total_portfolio_impact"]) < 1e-9


class TestSchemas:
    def test_run_request_optional_fields(self):
        req = RunSimulationRequest(
            scenario_id="x",
            portfolio_allocation={"technology": 0.5},
            sector_data={"technology": {"return_pct": 5.0, "volatility": 20.0}},
        )
        assert req.portfolio_allocation == {"technology": 0.5}
        assert req.sector_data["technology"]["return_pct"] == 5.0

    def test_portfolio_request_defaults(self):
        req = PortfolioImpactRequest()
        assert req.horizon_days == 90
        assert req.portfolio_allocation is None


class TestRoutes:
    def test_create_and_run_with_allocation(self):
        created = client.post(
            "/api/simulation/create",
            json={"title": "Hike", "description": "d", "events": [], "assumptions": []},
        )
        assert created.status_code == 200
        scenario_id = created.json()["scenario_id"]

        run = client.post(
            "/api/simulation/run",
            json={
                "scenario_id": scenario_id,
                "horizons": [30, 90],
                "portfolio_allocation": {"technology": 0.5, "energy": 0.5},
                "sector_data": {
                    "technology": {"return_pct": 6.0, "volatility": 25.0},
                    "energy": {"return_pct": -8.0, "volatility": 30.0},
                },
            },
        )
        assert run.status_code == 200
        body = run.json()
        assert body["status"] == "completed"
        pi = body["portfolio_impact"]
        assert "total_portfolio_impact" in pi
        assert set(pi["sector_contributions"].keys()) == {"technology", "energy"}
        assert "summary" in pi

    def test_post_portfolio_impact(self):
        created = client.post(
            "/api/simulation/create",
            json={"title": "Hike", "description": "d", "events": [], "assumptions": []},
        )
        sim_id = created.json()["simulation_id"]

        resp = client.post(
            f"/api/simulation/{sim_id}/portfolio",
            json={
                "horizon_days": 180,
                "portfolio_allocation": {"healthcare": 0.5, "defense": 0.5},
                "sector_data": {
                    "healthcare": {"return_pct": 3.0, "volatility": 20.0},
                    "defense": {"return_pct": 2.0, "volatility": 18.0},
                },
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["horizon_days"] == 180
        assert set(body["sector_contributions"].keys()) == {"healthcare", "defense"}

    def test_health(self):
        resp = client.get("/api/simulation/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

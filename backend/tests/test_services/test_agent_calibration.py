"""Tests for AgentCalibrationService and reliability diagram calculation."""

from app.services.agent_calibration_service import AgentCalibrationService


def test_agent_calibration_benchmarks():
    service = AgentCalibrationService()
    benchmarks = service.get_agent_benchmarks()
    # Benchmarks are curated demonstration data and must be labeled as such.
    assert benchmarks["seed"] is True
    assert benchmarks["data_status"] == "seed"

    agents = benchmarks["agents"]
    assert "GeopoliticalAgent" in agents
    assert "ForecastAgent" in agents
    assert "HistoricalAgent" in agents
    assert "MarketAgent" in agents

    geo = agents["GeopoliticalAgent"]
    assert geo["accuracy_pct"] >= 0.0
    assert geo["brier_score"] >= 0.0
    assert geo["base_weight"] > 0


def test_agent_calibration_summary():
    service = AgentCalibrationService()
    summary = service.get_calibration_summary()
    # Calibration figures are seed data until real evaluations exist.
    assert summary["seed"] is True
    assert summary["data_status"] == "seed"
    assert summary["provenance"] == "curated demonstration data"
    assert summary["calibration_index_pct"] >= 0.0
    assert summary["expected_calibration_error"] >= 0.0
    assert len(summary["reliability_curve"]) == 5
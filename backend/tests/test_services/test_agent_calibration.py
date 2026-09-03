"""Tests for AgentCalibrationService and reliability diagram calculation."""

from app.services.agent_calibration_service import AgentCalibrationService


def test_agent_calibration_benchmarks():
    service = AgentCalibrationService()
    benchmarks = service.get_agent_benchmarks()
    assert "GeopoliticalAgent" in benchmarks
    assert "ForecastAgent" in benchmarks
    assert "HistoricalAgent" in benchmarks
    assert "MarketAgent" in benchmarks

    geo = benchmarks["GeopoliticalAgent"]
    assert geo["accuracy_pct"] >= 60.0
    assert geo["brier_score"] < 0.20
    assert geo["base_weight"] > 0


def test_agent_calibration_summary():
    service = AgentCalibrationService()
    summary = service.get_calibration_summary()
    assert summary["calibration_index_pct"] > 80.0
    assert summary["expected_calibration_error"] < 0.15
    assert len(summary["reliability_curve"]) == 5

"""Tests for PredictionLedgerService and backtesting evaluation."""

import pytest
from app.services.prediction_ledger_service import PredictionLedgerService


def test_prediction_ledger_seeded_records():
    service = PredictionLedgerService()
    records = service.get_ledger()
    assert len(records) >= 5
    nvda_records = service.get_ledger(ticker="NVDA")
    assert len(nvda_records) >= 2
    for r in nvda_records:
        assert r["ticker"] == "NVDA"
        # Seeded demonstration records must be explicitly labeled.
        assert r["seed"] is True
        assert r["data_status"] == "seed"
        assert r["data_source"] == "curated demonstration data"


def test_prediction_ledger_record_and_evaluate():
    service = PredictionLedgerService()
    new_record = service.record_prediction(
        ticker="AMD",
        target="Advanced Micro Devices Tactical GPU Outlook",
        predicted_direction="BULLISH",
        probability=0.74,
        confidence=0.79,
        expected_return_pct=7.5,
        time_horizon="7d",
        entry_price=150.0,
    )

    assert new_record["ticker"] == "AMD"
    assert new_record["status"] == "PENDING"
    assert new_record["prediction_id"].startswith("pred-")
    # Live records must NOT be labeled as seed data.
    assert new_record["seed"] is False
    assert new_record["data_status"] == "live"

    # Evaluate with price move
    evaluated = service.evaluate_matured_predictions(current_quotes={"AMD": 162.0})
    # Since maturity_date is in future for new record, it stays PENDING
    assert isinstance(evaluated, list)


def test_prediction_ledger_compute_backtest_metrics():
    service = PredictionLedgerService()
    metrics = service.compute_backtest_metrics()
    assert metrics["total_evaluated"] >= 5
    assert metrics["win_rate_pct"] >= 0.0
    assert metrics["directional_accuracy_pct"] >= 0.0
    assert metrics["mean_brier_score"] >= 0.0
    assert metrics["profit_factor"] >= 0.0
    # Metrics derive entirely from seeded records, so they must be labeled seed.
    assert metrics["seed"] is True
    assert metrics["data_status"] == "seed"
    assert metrics["provenance"] == "curated demonstration data"


def test_prediction_ledger_empty_metrics_are_honest():
    service = PredictionLedgerService()
    metrics = service.compute_backtest_metrics(ticker="NOT_A_REAL_TICKER")
    assert metrics["total_evaluated"] == 0
    assert metrics["calibration_index_pct"] == 0.0
    assert metrics["data_status"] == "none"
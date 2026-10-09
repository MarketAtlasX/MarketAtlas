"""Unit tests for the pure watchlist alert evaluation logic.

These exercise the threshold-boundary and dedupe rules without a database or a
live provider.
"""

from datetime import datetime, timedelta

from app.models.watchlist_alert import WatchlistAlertRule
from app.services.watchlist_alert_service import evaluate_rule


def _rule(**overrides) -> WatchlistAlertRule:
    defaults = dict(
        id="rule-1",
        user_id=1,
        watchlist_id="wl-1",
        ticker="XOM",
        kind="target_price",
        threshold=130.0,
        percent_threshold=None,
        direction=None,
        cooldown_seconds=900,
        is_active=True,
        last_state=None,
        last_triggered_at=None,
    )
    defaults.update(overrides)
    return WatchlistAlertRule(**defaults)


def _market(price=131.0, change=2.0, change_percent=1.5, previous_close=129.0, status="provider-backed"):
    return {
        "status": status,
        "symbol": "XOM",
        "price": price,
        "change": change,
        "change_percent": change_percent,
        "previous_close": previous_close,
    }


NOW = datetime(2026, 10, 9, 12, 0, 0)


def test_target_price_upward_crossing_fires():
    result = evaluate_rule(_rule(), _market(), NOW)
    assert result.trigger is not None
    assert result.trigger["direction"] == "above"
    assert result.state == "above"


def test_target_price_no_crossing_when_already_above():
    rule = _rule(last_state="above")
    result = evaluate_rule(rule, _market(), NOW)
    assert result.trigger is None
    assert result.state == "above"


def test_boundary_equality_counts_as_above():
    result = evaluate_rule(_rule(threshold=130.0), _market(price=130.0, previous_close=129.0), NOW)
    assert result.state == "above"
    assert result.trigger is not None


def test_stop_loss_downward_crossing_fires():
    rule = _rule(kind="stop_loss", threshold=100.0)
    result = evaluate_rule(rule, _market(price=99.5, previous_close=101.0), NOW)
    assert result.trigger is not None
    assert result.trigger["direction"] == "below"


def test_direction_filter_blocks_opposite_side():
    result = evaluate_rule(_rule(direction="below"), _market(), NOW)
    assert result.trigger is None


def test_cooldown_suppresses_repeat():
    rule = _rule(last_state="below", last_triggered_at=NOW - timedelta(seconds=10))
    result = evaluate_rule(rule, _market(), NOW)
    assert result.trigger is None
    assert result.reason == "cooldown"


def test_unavailable_quote_is_not_evaluated():
    result = evaluate_rule(_rule(), _market(status="unavailable", price=None), NOW)
    assert result.evaluable is False
    assert result.trigger is None


def test_first_evaluation_without_baseline_does_not_fire():
    rule = _rule(last_state=None)
    result = evaluate_rule(rule, _market(previous_close=None), NOW)
    assert result.trigger is None


def test_percent_move_fires_once_per_direction():
    rule = _rule(kind="percent_move", threshold=None, percent_threshold=1.0, last_state=None)
    first = evaluate_rule(rule, _market(change_percent=2.0), NOW)
    assert first.trigger is not None
    assert first.state == "up"

    rule.last_state = "up"
    rule.last_triggered_at = NOW - timedelta(seconds=5)
    repeat = evaluate_rule(rule, _market(change_percent=2.4), NOW)
    assert repeat.trigger is None


def test_percent_move_below_threshold_does_not_fire():
    rule = _rule(kind="percent_move", threshold=None, percent_threshold=5.0)
    result = evaluate_rule(rule, _market(change_percent=1.2), NOW)
    assert result.trigger is None
    assert result.state == "flat"


def test_event_severity_requires_recorded_event():
    rule = _rule(kind="event_severity", threshold=7.0)
    assert evaluate_rule(rule, None, NOW, latest_event_severity=None).evaluable is False

    fired = evaluate_rule(rule, None, NOW, latest_event_severity=8.0)
    assert fired.trigger is not None
    assert fired.state == "above"

    below = evaluate_rule(_rule(kind="event_severity", threshold=7.0), None, NOW, latest_event_severity=3.0)
    assert below.trigger is None
    assert below.state == "below"

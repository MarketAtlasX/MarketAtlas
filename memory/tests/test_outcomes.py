from episodic_memory.models import OutcomeCategory, OutcomeSeverity
from outcomes import OutcomeTracker, OutcomeAnalyzer


def test_record_outcome(sample_episode):
    tracker = OutcomeTracker()
    outcome = tracker.record_outcome(
        episode=sample_episode,
        category=OutcomeCategory.MARKET,
        metric="Brent Crude",
        value=5.0,
        unit="%",
        direction="up",
    )
    assert outcome.metric == "Brent Crude"
    assert outcome.value == 5.0
    assert len(sample_episode.outcomes) == 1


def test_record_market_outcome(sample_episode):
    tracker = OutcomeTracker()
    outcome = tracker.record_market_outcome(
        episode=sample_episode,
        asset="Gold",
        price_change_pct=3.5,
    )
    assert outcome.category == OutcomeCategory.MARKET
    assert outcome.direction == "up"


def test_record_negative_market_outcome(sample_episode):
    tracker = OutcomeTracker()
    outcome = tracker.record_market_outcome(
        episode=sample_episode,
        asset="S&P 500",
        price_change_pct=-2.1,
    )
    assert outcome.direction == "down"


def test_outcome_severity_classification():
    tracker = OutcomeTracker()
    assert tracker._classify_severity(1.0) == OutcomeSeverity.MINOR
    assert tracker._classify_severity(3.0) == OutcomeSeverity.MODERATE
    assert tracker._classify_severity(10.0) == OutcomeSeverity.MAJOR
    assert tracker._classify_severity(20.0) == OutcomeSeverity.CRITICAL


def test_outcome_summary(sample_episode_with_outcomes):
    tracker = OutcomeTracker()
    summary = tracker.summary(sample_episode_with_outcomes)
    assert summary["total"] == 2
    assert "market" in summary["categories"]
    assert "economic" in summary["categories"]


def test_analyzer_aggregate(sample_episode_with_outcomes):
    analyzer = OutcomeAnalyzer()
    result = analyzer.aggregate_by_category([sample_episode_with_outcomes])
    assert "market" in result
    assert "economic" in result


def test_analyzer_sector_impact(sample_episode_with_outcomes):
    analyzer = OutcomeAnalyzer()
    result = analyzer.sector_impact_summary([sample_episode_with_outcomes])
    assert "energy" in result
    assert result["energy"]["avg_impact"] > 0

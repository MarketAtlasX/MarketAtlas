from collections import defaultdict
from datetime import datetime, timedelta
from statistics import mean, stdev
from typing import Any

from episodic_memory.models import Episode, Outcome, OutcomeCategory


class OutcomeAnalyzer:
    def aggregate_by_category(self, episodes: list[Episode]) -> dict[str, Any]:
        categories: dict[str, list[Outcome]] = defaultdict(list)
        for ep in episodes:
            for outcome in ep.outcomes:
                categories[outcome.category.value].append(outcome)

        result = {}
        for cat, outcomes in categories.items():
            values = [o.value for o in outcomes if o.unit == "%"]
            result[cat] = {
                "count": len(outcomes),
                "avg_value": mean(values) if values else 0,
                "std_value": stdev(values) if len(values) > 1 else 0,
                "metrics": list(set(o.metric for o in outcomes)),
            }
        return result

    def correlation_by_event_type(
        self, episodes: list[Episode]
    ) -> dict[str, dict[str, float]]:
        event_type_outcomes: dict[str, list[float]] = defaultdict(list)
        for ep in episodes:
            market_outcomes = [
                o for o in ep.outcomes if o.category == OutcomeCategory.MARKET
            ]
            avg = mean([o.value for o in market_outcomes]) if market_outcomes else 0

            event_types = {e.event_type for e in ep.timeline.events}
            for et in event_types:
                event_type_outcomes[et].append(avg)

        correlations: dict[str, dict[str, float]] = {}
        for event_type, values in event_type_outcomes.items():
            if len(values) < 2:
                continue
            positive = sum(1 for v in values if v > 0)
            negative = sum(1 for v in values if v < 0)
            correlations[event_type] = {
                "count": len(values),
                "avg_market_impact": mean(values),
                "positive_ratio": positive / len(values),
                "negative_ratio": negative / len(values),
            }

        return correlations

    def find_high_impact_outcomes(
        self,
        episodes: list[Episode],
        threshold: float = 5.0,
    ) -> list[tuple[Episode, Outcome]]:
        results = []
        for ep in episodes:
            for outcome in ep.outcomes:
                if outcome.unit == "%" and abs(outcome.value) >= threshold:
                    results.append((ep, outcome))
        results.sort(key=lambda x: abs(x[1].value), reverse=True)
        return results

    def typical_timeframe(
        self, episodes: list[Episode]
    ) -> dict[str, float]:
        durations = []
        for ep in episodes:
            d = ep.timeline.duration_days()
            if d and d > 0:
                durations.append(d)

        if not durations:
            return {"mean_days": 0, "median_days": 0, "min_days": 0, "max_days": 0}

        sorted_d = sorted(durations)
        n = len(sorted_d)
        return {
            "mean_days": mean(durations),
            "median_days": (
                sorted_d[n // 2] if n % 2 == 1
                else (sorted_d[n // 2 - 1] + sorted_d[n // 2]) / 2
            ),
            "min_days": min(durations),
            "max_days": max(durations),
        }

    def sector_impact_summary(
        self, episodes: list[Episode]
    ) -> dict[str, dict[str, float]]:
        sector_outcomes: dict[str, list[float]] = defaultdict(list)
        for ep in episodes:
            market_outcomes = [
                o for o in ep.outcomes if o.category == OutcomeCategory.MARKET
            ]
            for sector in ep.sectors:
                for o in market_outcomes:
                    sector_outcomes[sector].append(o.value)

        summary = {}
        for sector, values in sector_outcomes.items():
            if values:
                summary[sector] = {
                    "avg_impact": mean(values),
                    "max_impact": max(values),
                    "min_impact": min(values),
                    "volatility": stdev(values) if len(values) > 1 else 0,
                    "observation_count": len(values),
                }

        return summary

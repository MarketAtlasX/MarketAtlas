from datetime import datetime, timedelta
from typing import Optional

from episodic_memory.models import Episode, Outcome, OutcomeCategory, OutcomeSeverity


class OutcomeTracker:
    def __init__(self):
        pass

    def record_outcome(
        self,
        episode: Episode,
        category: OutcomeCategory,
        metric: str,
        value: float,
        unit: str = "",
        direction: str = "neutral",
        severity: OutcomeSeverity = OutcomeSeverity.MODERATE,
        description: str = "",
        source: Optional[str] = None,
        confidence: float = 0.5,
    ) -> Outcome:
        outcome = Outcome(
            category=category,
            metric=metric,
            value=value,
            unit=unit,
            direction=direction,
            severity=severity,
            timestamp=datetime.utcnow(),
            description=description,
            source=source,
            confidence=confidence,
        )
        episode.add_outcome(outcome)
        return outcome

    def record_market_outcome(
        self,
        episode: Episode,
        asset: str,
        price_change_pct: float,
        description: str = "",
    ) -> Outcome:
        direction = "up" if price_change_pct > 0 else "down"
        severity = self._classify_severity(abs(price_change_pct))
        return self.record_outcome(
            episode=episode,
            category=OutcomeCategory.MARKET,
            metric=asset,
            value=abs(price_change_pct),
            unit="%",
            direction=direction,
            severity=severity,
            description=description or f"{asset} moved {direction} {abs(price_change_pct):.1f}%",
        )

    def record_economic_outcome(
        self,
        episode: Episode,
        indicator: str,
        value: float,
        unit: str,
        direction: str,
        description: str = "",
    ) -> Outcome:
        return self.record_outcome(
            episode=episode,
            category=OutcomeCategory.ECONOMIC,
            metric=indicator,
            value=value,
            unit=unit,
            direction=direction,
            description=description or f"{indicator}: {value}{unit} ({direction})",
        )

    def get_trend(
        self,
        episode: Episode,
        category: OutcomeCategory,
        metric: str,
    ) -> list[Outcome]:
        return [
            o
            for o in episode.outcomes
            if o.category == category and o.metric == metric
        ]

    def get_outcomes_since(
        self,
        episode: Episode,
        days: int,
    ) -> list[Outcome]:
        cutoff = datetime.utcnow() - timedelta(days=days)
        return [o for o in episode.outcomes if o.timestamp >= cutoff]

    def summary(self, episode: Episode) -> dict:
        if not episode.outcomes:
            return {"total": 0, "categories": {}}

        categories: dict[str, list[dict]] = {}
        for o in episode.outcomes:
            cat = o.category.value
            if cat not in categories:
                categories[cat] = []
            categories[cat].append({
                "metric": o.metric,
                "value": o.value,
                "unit": o.unit,
                "direction": o.direction,
                "timestamp": o.timestamp.isoformat(),
                "severity": o.severity.value,
            })

        return {
            "total": len(episode.outcomes),
            "categories": categories,
            "latest_update": max(o.timestamp for o in episode.outcomes).isoformat(),
        }

    def _classify_severity(self, pct: float) -> OutcomeSeverity:
        if pct < 2:
            return OutcomeSeverity.MINOR
        elif pct < 5:
            return OutcomeSeverity.MODERATE
        elif pct < 15:
            return OutcomeSeverity.MAJOR
        return OutcomeSeverity.CRITICAL

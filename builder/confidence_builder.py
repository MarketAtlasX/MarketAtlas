from __future__ import annotations

from typing import List, Optional

from graph_engine.models.graph_models import ConfidenceFactor, ConfidenceGraph


class ConfidenceGraphBuilder:
    FACTOR_NAMES = [
        "Data Quality",
        "Historical Similarity",
        "Agent Agreement",
        "World State Stability",
        "Market Volatility",
    ]

    def build(
        self,
        target: str,
        prediction_value: Optional[float] = None,
        prediction_direction: str = "neutral",
        factor_values: Optional[List[float]] = None,
    ) -> ConfidenceGraph:
        if factor_values is None:
            factor_values = self._compute_factors(target)

        if len(factor_values) != len(self.FACTOR_NAMES):
            factor_values = factor_values[: len(self.FACTOR_NAMES)]
            while len(factor_values) < len(self.FACTOR_NAMES):
                factor_values.append(0.5)

        factors = [
            ConfidenceFactor(
                name=name,
                value=round(val, 3),
                weight=round(val / max(sum(factor_values), 0.001), 3),
                description=self._get_description(name, val),
            )
            for name, val in zip(self.FACTOR_NAMES, factor_values)
        ]

        overall = round(sum(f.value * f.weight for f in factors) / max(sum(f.weight for f in factors), 0.001), 3)

        return ConfidenceGraph(
            target=target,
            overall_confidence=overall,
            factors=factors,
            prediction_value=prediction_value,
            prediction_direction=prediction_direction,
        )

    def _compute_factors(self, target: str) -> List[float]:
        import random
        return [
            round(random.uniform(0.4, 0.95), 2) for _ in self.FACTOR_NAMES
        ]

    def _get_description(self, name: str, value: float) -> str:
        descriptions = {
            "Data Quality": (
                f"{'High' if value > 0.7 else 'Moderate' if value > 0.4 else 'Low'} quality data sources available. "
                f"Confidence in input data reliability: {value:.0%}"
            ),
            "Historical Similarity": (
                f"{'Strong' if value > 0.7 else 'Moderate' if value > 0.4 else 'Weak'} historical analogues found. "
                f"Past events match current pattern at {value:.0%}"
            ),
            "Agent Agreement": (
                f"{'Strong' if value > 0.7 else 'Moderate' if value > 0.4 else 'Weak'} consensus among AI agents. "
                f"Agent agreement level: {value:.0%}"
            ),
            "World State Stability": (
                f"{'Stable' if value > 0.7 else 'Moderate' if value > 0.4 else 'Unstable'} world state conditions. "
                f"Stability index: {value:.0%}"
            ),
            "Market Volatility": (
                f"{'Low' if value > 0.7 else 'Moderate' if value > 0.4 else 'High'} market volatility detected. "
                f"Volatility confidence: {value:.0%}"
            ),
        }
        return descriptions.get(name, "")

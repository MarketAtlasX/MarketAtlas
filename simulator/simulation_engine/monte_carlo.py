from __future__ import annotations

import logging
import random
from typing import Any, Dict, List, Optional

from simulator.models.scenario import Scenario

logger = logging.getLogger(__name__)


class MonteCarloEngine:
    def __init__(self, seed: Optional[int] = None):
        self.rng = random.Random(seed)

    def run(
        self,
        scenario: Scenario,
        base_state: Dict[str, Any],
        num_runs: int = 100,
        horizons: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        if horizons is None:
            horizons = [0, 1, 7, 30, 90, 180, 365]

        all_paths: List[List[Dict[str, float]]] = []
        path_confidences: List[float] = []

        for run_idx in range(num_runs):
            sample = self._sample_scenario(scenario)
            path = self._run_single_path(scenario, base_state, sample, horizons)
            all_paths.append(path)
            path_confidences.append(sample.get("confidence", 0.5))

        aggregated = self._aggregate_results(all_paths, path_confidences, horizons)

        return aggregated

    def _sample_scenario(self, scenario: Scenario) -> Dict[str, Any]:
        sample = {
            "assumption_hits": [],
            "severity_adjustments": [],
            "confidence": 1.0,
        }

        for assumption in scenario.assumptions.get_active_assumptions():
            hit = self.rng.random() < assumption.probability
            sample["assumption_hits"].append(hit)
            if not hit:
                sample["confidence"] *= 0.85

        for event in scenario.injected_events:
            noise = self.rng.gauss(0, 0.1)
            adj = max(0.0, min(1.0, event.severity + noise))
            sample["severity_adjustments"].append(adj)
            sample["confidence"] *= (1 - abs(noise) * 0.1)

        sample["confidence"] = max(0.05, min(1.0, sample["confidence"]))
        return sample

    def _run_single_path(
        self,
        scenario: Scenario,
        base_state: Dict[str, Any],
        sample: Dict[str, Any],
        horizons: List[int],
    ) -> List[Dict[str, float]]:
        path = []
        base_oil = base_state.get("global_indicators", {}).get("oil_price", 82.0)
        base_vix = base_state.get("global_indicators", {}).get("vix", 18.5)

        base_risk = sum(e.severity for e in scenario.injected_events) / max(len(scenario.injected_events), 1)

        for h_days in horizons:
            time_factor = min(1.0, h_days / 180.0)
            assumption_factor = sum(sample["assumption_hits"]) / max(len(sample["assumption_hits"]), 1)
            severity_factor = sum(sample["severity_adjustments"]) / max(len(sample["severity_adjustments"]), 1)

            total_factor = base_risk * assumption_factor * severity_factor * time_factor
            noise = self.rng.gauss(0, 0.05 * (1 + h_days / 365.0))

            path.append({
                "horizon_days": h_days,
                "risk_score": min(1.0, max(0.0, total_factor + noise)),
                "oil_price": round(base_oil * (1 + total_factor * 0.3) + noise * 5, 1),
                "vix": round(base_vix * (1 + total_factor * 0.5) + noise * 3, 1),
                "market_impact": round(-total_factor * 0.2 + noise * 0.02, 4),
                "confidence": sample["confidence"],
            })

        return path

    def _aggregate_results(
        self,
        all_paths: List[List[Dict[str, float]]],
        path_confidences: List[float],
        horizons: List[int],
    ) -> Dict[str, Any]:
        if not all_paths:
            return {
                "paths_simulated": 0,
                "average_confidence": 0,
                "horizons": [],
            }

        avg_confidence = sum(path_confidences) / len(path_confidences)
        horizon_stats = []

        for h_idx, h_days in enumerate(horizons):
            values_at_horizon = [p[h_idx] for p in all_paths if len(p) > h_idx]
            if not values_at_horizon:
                continue

            risk_scores = [v["risk_score"] for v in values_at_horizon]
            oil_prices = [v["oil_price"] for v in values_at_horizon]
            vix_values = [v["vix"] for v in values_at_horizon]
            market_impacts = [v["market_impact"] for v in values_at_horizon]

            risk_scores.sort()
            oil_prices.sort()
            vix_values.sort()
            market_impacts.sort()

            horizon_stats.append({
                "horizon_days": h_days,
                "samples": len(values_at_horizon),
                "risk_score": {
                    "mean": round(sum(risk_scores) / len(risk_scores), 4),
                    "median": risk_scores[len(risk_scores) // 2],
                    "p10": risk_scores[len(risk_scores) // 10],
                    "p90": risk_scores[len(risk_scores) * 9 // 10],
                    "std": self._std_dev(risk_scores),
                },
                "oil_price": {
                    "mean": round(sum(oil_prices) / len(oil_prices), 1),
                    "median": oil_prices[len(oil_prices) // 2],
                    "p10": oil_prices[len(oil_prices) // 10],
                    "p90": oil_prices[len(oil_prices) * 9 // 10],
                },
                "vix": {
                    "mean": round(sum(vix_values) / len(vix_values), 1),
                    "median": vix_values[len(vix_values) // 2],
                    "p10": vix_values[len(vix_values) // 10],
                    "p90": vix_values[len(vix_values) * 9 // 10],
                },
                "market_impact_percentile": {
                    "mean": round(sum(market_impacts) / len(market_impacts), 4),
                    "p10": market_impacts[len(market_impacts) // 10],
                    "p90": market_impacts[len(market_impacts) * 9 // 10],
                },
            })

        return {
            "paths_simulated": len(all_paths),
            "average_confidence": round(avg_confidence, 4),
            "total_samples": len(all_paths) * len(horizons),
            "horizons": horizon_stats,
        }

    def _std_dev(self, values: List[float]) -> float:
        mean = sum(values) / len(values)
        variance = sum((v - mean) ** 2 for v in values) / len(values)
        return round(variance ** 0.5, 4)

from __future__ import annotations

import copy
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from simulator.models.scenario import Assumption, AssumptionGraph, Scenario
from simulator.models.simulation import SimulationRun
from simulator.simulation_engine.runner import SimulationRunner

logger = logging.getLogger(__name__)


class CounterfactualEngine:
    def __init__(self):
        self.runner = SimulationRunner()

    def modify_assumption(
        self,
        scenario: Scenario,
        assumption_id: str,
        new_probability: float,
    ) -> Scenario:
        modified = copy.deepcopy(scenario)
        if assumption_id in modified.assumptions.assumptions:
            modified.assumptions.assumptions[assumption_id].probability = new_probability
        return modified

    def toggle_assumption(
        self,
        scenario: Scenario,
        assumption_id: str,
        active: bool,
    ) -> Scenario:
        modified = copy.deepcopy(scenario)
        if assumption_id in modified.assumptions.assumptions:
            modified.assumptions.assumptions[assumption_id].is_active = active
        return modified

    def modify_event_severity(
        self,
        scenario: Scenario,
        event_index: int,
        new_severity: float,
    ) -> Scenario:
        modified = copy.deepcopy(scenario)
        if 0 <= event_index < len(modified.injected_events):
            modified.injected_events[event_index].severity = new_severity
        return modified

    def modify_variable(
        self,
        scenario: Scenario,
        variable_path: str,
        new_value: Any,
    ) -> Scenario:
        modified = copy.deepcopy(scenario)
        keys = variable_path.split(".")
        target = modified
        for k in keys[:-1]:
            target = getattr(target, k, {})
        setattr(target, keys[-1], new_value)
        return modified

    def run_counterfactual(
        self,
        original_scenario: Scenario,
        original_run: SimulationRun,
        modifications: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        modified_scenario = copy.deepcopy(original_scenario)
        for mod in modifications:
            mod_type = mod.get("type", "assumption")
            if mod_type == "assumption":
                modified_scenario = self.modify_assumption(
                    modified_scenario,
                    mod["assumption_id"],
                    mod.get("new_probability", 0.5),
                )
            elif mod_type == "toggle_assumption":
                modified_scenario = self.toggle_assumption(
                    modified_scenario,
                    mod["assumption_id"],
                    mod.get("active", True),
                )
            elif mod_type == "event_severity":
                modified_scenario = self.modify_event_severity(
                    modified_scenario,
                    mod["event_index"],
                    mod.get("new_severity", 0.5),
                )

        new_run = self.runner.run(
            modified_scenario,
            horizons=[0, 7, 30, 90, 180, 365],
            monte_carlo_runs=50,
        )

        return {
            "counterfactual_id": str(uuid.uuid4()),
            "modifications": modifications,
            "modified_scenario": modified_scenario.to_dict(),
            "original_run_id": original_run.run_id,
            "new_run": new_run.to_dict(),
            "deltas": self._compute_deltas(original_run, new_run),
        }

    def _compute_deltas(
        self,
        original: SimulationRun,
        modified: SimulationRun,
    ) -> Dict[str, Any]:
        deltas = {}
        for h_days in set(list(original.horizon_results.keys()) + list(modified.horizon_results.keys())):
            orig = original.horizon_results.get(h_days)
            mod = modified.horizon_results.get(h_days)
            if orig and mod:
                risk_deltas = {}
                for metric in set(list(orig.risk_scores.keys()) + list(mod.risk_scores.keys())):
                    diff = mod.risk_scores.get(metric, 0) - orig.risk_scores.get(metric, 0)
                    risk_deltas[metric] = round(diff, 4)

                market_deltas = {}
                for metric in set(list(orig.market_impact.keys()) + list(mod.market_impact.keys())):
                    diff = mod.market_impact.get(metric, 0) - orig.market_impact.get(metric, 0)
                    market_deltas[metric] = round(diff, 4)

                deltas[str(h_days)] = {
                    "confidence_delta": round(mod.confidence - orig.confidence, 4),
                    "uncertainty_delta": round(mod.uncertainty - orig.uncertainty, 4),
                    "risk_deltas": risk_deltas,
                    "market_deltas": market_deltas,
                }
        return deltas

    def sensitivity_analysis(
        self,
        scenario: Scenario,
        target_metric: str,
    ) -> List[Dict[str, Any]]:
        results = []
        base_run = self.runner.run(scenario)
        base_value = self._extract_metric(base_run, target_metric)

        for aid, assumption in scenario.assumptions.assumptions.items():
            for prob in [0.0, 0.25, 0.5, 0.75, 1.0]:
                if abs(prob - assumption.probability) < 0.01:
                    continue
                modified = self.modify_assumption(scenario, aid, prob)
                run = self.runner.run(modified, horizons=[30], monte_carlo_runs=20)
                new_value = self._extract_metric(run, target_metric)
                results.append({
                    "assumption_id": aid,
                    "assumption_description": assumption.description,
                    "original_probability": assumption.probability,
                    "tested_probability": prob,
                    "base_metric_value": base_value,
                    "new_metric_value": new_value,
                    "delta": round(new_value - base_value, 4),
                    "sensitivity": round(abs(new_value - base_value) / max(abs(base_value), 0.01), 4),
                })

        results.sort(key=lambda r: r["sensitivity"], reverse=True)
        return results

    def _extract_metric(self, run: SimulationRun, metric: str) -> float:
        for result in run.horizon_results.values():
            if metric in result.market_impact:
                return result.market_impact[metric]
            if metric in result.risk_scores:
                return result.risk_scores[metric]
        return 0.0

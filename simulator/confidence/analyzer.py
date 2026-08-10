from __future__ import annotations

from typing import Any, Dict, List, Optional

from simulator.models.agents import AgentReport, ChiefReport
from simulator.models.scenario import AssumptionGraph, Scenario
from simulator.models.simulation import HorizonResult, SimulationRun


class ConfidenceAnalyzer:
    def analyze_run(self, run: SimulationRun) -> Dict[str, Any]:
        horizon_confidences = {}
        for h_days, result in run.horizon_results.items():
            horizon_confidences[str(h_days)] = {
                "horizon_confidence": result.confidence,
                "uncertainty": result.uncertainty,
                "signal_quality": result.confidence * (1 - result.uncertainty),
            }

        agent_confidences = {}
        for agent_type, report in run.chief_report.agent_reports.items():
            agent_confidences[agent_type.value] = {
                "confidence": report.confidence,
                "impact_count": len(report.impacts),
                "weight": report.confidence / max(run.average_confidence, 0.01),
            }

        return {
            "overall_confidence": run.average_confidence,
            "chief_confidence": run.chief_report.overall_confidence,
            "mc_confidence": run.monte_carlo_stats.get("average_confidence", 0),
            "consensus_score": run.chief_report.consensus_score,
            "horizon_confidences": horizon_confidences,
            "agent_confidences": agent_confidences,
            "uncertainty_trend": self._uncertainty_trend(run),
            "confidence_rating": self._rating(run.average_confidence),
        }

    def analyze_assumptions(
        self,
        assumptions: AssumptionGraph,
        run: SimulationRun,
    ) -> Dict[str, Any]:
        analysis = {}
        for aid, assumption in assumptions.assumptions.items():
            downstream_impact = 0.0
            for result in run.horizon_results.values():
                for metric, value in result.market_impact.items():
                    downstream_impact += abs(value) * assumption.probability * 0.01

            analysis[aid] = {
                "probability": assumption.probability,
                "is_active": assumption.is_active,
                "downstream_impact": round(downstream_impact, 4),
                "sensitivity": round(assumption.probability * downstream_impact, 4),
                "category": assumption.category,
            }

        return {
            "assumptions": analysis,
            "most_sensitive": max(analysis.items(), key=lambda x: x[1]["sensitivity"])[0] if analysis else None,
            "average_probability": (
                sum(a.probability for a in assumptions.assumptions.values())
                / max(len(assumptions.assumptions), 1)
            ),
        }

    def _uncertainty_trend(self, run: SimulationRun) -> str:
        uncertainties = [
            r.uncertainty for r in sorted(
                run.horizon_results.values(), key=lambda x: x.horizon_days
            )
        ]
        if len(uncertainties) < 2:
            return "stable"
        if uncertainties[-1] > uncertainties[0] * 1.2:
            return "increasing"
        if uncertainties[-1] < uncertainties[0] * 0.8:
            return "decreasing"
        return "stable"

    def _rating(self, confidence: float) -> str:
        if confidence >= 0.8:
            return "high"
        if confidence >= 0.6:
            return "moderate"
        if confidence >= 0.4:
            return "low"
        return "very_low"

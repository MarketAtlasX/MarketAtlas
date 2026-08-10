from __future__ import annotations

from typing import Any, Dict, List

from simulator.models.agents import (
    AgentReport,
    AgentType,
    ChiefReport,
    ImpactMetric,
)
from simulator.models.scenario import Scenario
from simulator.models.world import SimulationWorld


class ChiefIntelligenceAgent:
    def __init__(self):
        self.name = "Chief Intelligence Agent"

    def synthesize(
        self,
        scenario: Scenario,
        agent_reports: Dict[AgentType, AgentReport],
        horizon_days: int,
    ) -> ChiefReport:
        confidence_scores = [r.confidence for r in agent_reports.values()]
        avg_confidence = sum(confidence_scores) / max(len(confidence_scores), 1)
        consensus_score = self._compute_consensus(agent_reports, scenario)

        all_risks = []
        all_opportunities = []
        all_assumptions = set()
        all_impacts: Dict[str, List[ImpactMetric]] = {}

        for agent_type, report in agent_reports.items():
            all_risks.extend(report.key_risks)
            all_opportunities.extend(report.key_opportunities)
            all_assumptions.update(report.assumptions_used)
            for impact in report.impacts:
                if impact.name not in all_impacts:
                    all_impacts[impact.name] = []
                all_impacts[impact.name].append(impact)

        top_risks = self._deduplicate(all_risks)[:5]
        top_opportunities = self._deduplicate(all_opportunities)[:3]

        sector_winners, sector_losers = self._extract_sectors(agent_reports)

        recommended_actions = self._generate_recommendations(
            agent_reports, scenario, horizon_days
        )

        key_uncertainties = [
            a.description for a in scenario.assumptions.get_active_assumptions()
            if a.probability < 0.5
        ]

        outlook = self._determine_outlook(avg_confidence, consensus_score, len(top_risks))

        return ChiefReport(
            summary=f"Scenario '{scenario.title}': {outlook} outlook at {horizon_days}d horizon. "
                    f"Consensus: {consensus_score:.0%}, Confidence: {avg_confidence:.0%}",
            overall_confidence=round(avg_confidence, 4),
            agent_reports=agent_reports,
            consensus_score=round(consensus_score, 4),
            key_uncertainties=key_uncertainties,
            scenario_outlook=outlook,
            recommended_actions=recommended_actions,
            sector_winners=sector_winners,
            sector_losers=sector_losers,
            reasoning_synthesis={
                "horizon_days": horizon_days,
                "agent_count": len(agent_reports),
                "total_assumptions": len(all_assumptions),
                "consensus_level": round(consensus_score, 4),
            },
        )

    def _compute_consensus(
        self,
        reports: Dict[AgentType, AgentReport],
        scenario: Scenario,
    ) -> float:
        if not reports:
            return 0.5
        directions = []
        for report in reports.values():
            for impact in report.impacts:
                if impact.direction in ("up", "down"):
                    directions.append(1.0 if impact.direction == "up" else -1.0)
        if not directions:
            return 0.5
        avg_dir = sum(directions) / len(directions)
        return min(1.0, abs(avg_dir) + 0.3)

    def _extract_sectors(
        self,
        reports: Dict[AgentType, AgentReport],
    ) -> tuple[List[str], List[str]]:
        sector_map: Dict[str, float] = {}
        for report in reports.values():
            for impact in report.impacts:
                if impact.name.startswith("sector_"):
                    sector = impact.name.replace("sector_", "")
                    sector_map[sector] = impact.value
        winners = [s for s, v in sorted(sector_map.items(), key=lambda x: x[1], reverse=True) if v > 0][:3]
        losers = [s for s, v in sorted(sector_map.items(), key=lambda x: x[1]) if v < 0][:3]
        return winners, losers

    def _generate_recommendations(
        self,
        reports: Dict[AgentType, AgentReport],
        scenario: Scenario,
        horizon_days: int,
    ) -> List[str]:
        recommendations = []
        if horizon_days <= 30:
            recommendations.append("Monitor liquidity positions closely")
            recommendations.append("Review stop-loss and hedging strategies")
        if horizon_days > 90:
            recommendations.append("Consider strategic allocation shifts based on new equilibrium")
        if any(r.confidence < 0.5 for r in reports.values()):
            recommendations.append("High uncertainty - maintain flexibility and avoid concentrated bets")
        recommendations.append("Run counterfactual simulations to test assumption sensitivity")
        return recommendations

    def _determine_outlook(
        self,
        confidence: float,
        consensus: float,
        risk_count: int,
    ) -> str:
        score = confidence * consensus * (1 - risk_count * 0.05)
        if score > 0.6:
            return "Moderately Positive"
        elif score > 0.35:
            return "Cautious"
        elif score > 0.15:
            return "Bearish"
        return "Highly Uncertain"

    def _deduplicate(self, items: List[str]) -> List[str]:
        seen = set()
        result = []
        for item in items:
            if item not in seen:
                seen.add(item)
                result.append(item)
        return result

from __future__ import annotations

from typing import Any, Dict, List

from simulator.agents.base import BaseAgent
from simulator.models.agents import AgentReport, AgentType, ImpactMetric
from simulator.models.scenario import EventType, Scenario
from simulator.models.world import SimulationWorld


class PortfolioAgent(BaseAgent):
    def __init__(self):
        super().__init__(AgentType.PORTFOLIO, "Portfolio Impact Agent")

    def analyze(
        self,
        scenario: Scenario,
        world_state: SimulationWorld,
        horizon_days: int,
    ) -> AgentReport:
        impacts: List[ImpactMetric] = []
        risks: List[str] = []
        opportunities: List[str] = []
        assumption_ids = [a.id for a in scenario.assumptions.get_active_assumptions()]

        severity_sum = sum(e.severity for e in scenario.injected_events)
        event_count = len(scenario.injected_events)
        avg_severity = severity_sum / max(event_count, 1)

        portfolio_volatility_impact = avg_severity * 0.15 * min(1.0, horizon_days / 90.0)
        max_drawdown_estimate = min(0.5, avg_severity * 0.2 * min(1.0, horizon_days / 180.0))

        sector_allocation_shift = {
            "defensive": 0.05 * avg_severity,
            "cyclical": -0.04 * avg_severity,
            "growth": -0.06 * avg_severity,
            "value": 0.02 * avg_severity,
            "commodities": 0.03 * avg_severity,
            "bonds": 0.04 * avg_severity,
            "cash": 0.03 * avg_severity,
        }

        impacts.append(self._build_impact(
            "portfolio_volatility",
            round(portfolio_volatility_impact, 4),
            "up",
            confidence=0.7,
            reasoning=f"Portfolio volatility increase: {portfolio_volatility_impact:.1%}",
        ))

        impacts.append(self._build_impact(
            "max_drawdown_estimate",
            round(max_drawdown_estimate, 4),
            "down",
            confidence=0.6,
            reasoning=f"Estimated max drawdown: {max_drawdown_estimate:.1%}",
        ))

        impacts.append(self._build_impact(
            "correlation_shift",
            round(min(0.6, avg_severity * 0.15), 4),
            "up",
            confidence=0.65,
            reasoning="Portfolio diversification benefit decreases in crisis",
        ))

        best_allocation = max(sector_allocation_shift.items(), key=lambda x: x[1])
        worst_allocation = min(sector_allocation_shift.items(), key=lambda x: x[1])

        risks.append(f"Overweight {worst_allocation[0]} hit hardest ({worst_allocation[1]:+.0%})")
        opportunities.append(f"Overweight {best_allocation[0]} provides buffer ({best_allocation[1]:+.0%})")

        if max_drawdown_estimate > 0.15:
            risks.append("Significant portfolio drawdown risk - consider hedging")
        if max_drawdown_estimate > 0.3:
            risks.append("Severe portfolio stress - capital preservation recommended")

        confidence = (0.65 - avg_severity * 0.1) * self._assumption_confidence_penalty(scenario.assumptions)

        return AgentReport(
            agent_type=self.agent_type,
            agent_name=self.name,
            summary=f"Portfolio: vol +{portfolio_volatility_impact:.0%}, max DD {max_drawdown_estimate:.0%}",
            impacts=impacts,
            confidence=round(confidence, 4),
            key_risks=risks,
            key_opportunities=opportunities,
            assumptions_used=assumption_ids,
            reasoning_graph={
                "portfolio_volatility": portfolio_volatility_impact,
                "max_drawdown": max_drawdown_estimate,
                "sector_allocation_shift": sector_allocation_shift,
            },
        )

from __future__ import annotations

from typing import Any, Dict, List

from simulator.agents.base import BaseAgent
from simulator.models.agents import AgentReport, AgentType, ImpactMetric
from simulator.models.scenario import EventType, Scenario
from simulator.models.world import SimulationWorld


class EconomicAgent(BaseAgent):
    def __init__(self):
        super().__init__(AgentType.ECONOMIC, "Economic Impact Agent")

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

        sanction_events = [e for e in scenario.injected_events if e.event_type == EventType.SANCTIONS]
        trade_events = [e for e in scenario.injected_events if e.event_type == EventType.TRADE_WAR]
        embargo_events = [e for e in scenario.injected_events if e.event_type == EventType.ENERGY_EMBARGO]

        total_economic_impact = len(sanction_events) * 0.15 + len(trade_events) * 0.2 + len(embargo_events) * 0.25

        base_inflation = world_state.global_indicators.get("inflation", 3.0)
        base_growth = world_state.global_indicators.get("gdp_growth", 2.5)

        inflation_impact = base_inflation * (1 + total_economic_impact * (horizon_days / 365.0))
        growth_impact = base_growth * (1 - total_economic_impact * (horizon_days / 365.0))

        impacts.append(self._build_impact(
            "inflation_forecast",
            round(inflation_impact, 1),
            "up" if inflation_impact > base_inflation else "stable",
            confidence=0.75,
            reasoning=f"Inflation projected at {inflation_impact:.1f}% from {base_inflation:.1f}% base",
        ))

        impacts.append(self._build_impact(
            "gdp_growth_impact",
            round(growth_impact, 1),
            "down" if growth_impact < base_growth else "stable",
            confidence=0.7,
            reasoning=f"GDP growth projected at {growth_impact:.1f}% from {base_growth:.1f}% base",
        ))

        impacts.append(self._build_impact(
            "economic_disruption_index",
            round(total_economic_impact, 4),
            "up",
            confidence=0.8,
            reasoning=f"{len(sanction_events)} sanctions, {len(trade_events)} trade actions, {len(embargo_events)} embargoes",
        ))

        if total_economic_impact > 0.3:
            risks.append("Significant economic contraction risk")
            risks.append("Supply-side inflation pressure")
        if total_economic_impact < 0.2:
            opportunities.append("Limited economic disruption expected")

        confidence = (0.75 - total_economic_impact * 0.2) * self._assumption_confidence_penalty(scenario.assumptions)

        return AgentReport(
            agent_type=self.agent_type,
            agent_name=self.name,
            summary=f"Economic impact: inflation +{inflation_impact - base_inflation:.1f}%, growth {growth_impact - base_growth:+.1f}%",
            impacts=impacts,
            confidence=round(confidence, 4),
            key_risks=risks,
            key_opportunities=opportunities,
            assumptions_used=assumption_ids,
            reasoning_graph={
                "total_economic_impact": total_economic_impact,
                "inflation_impact": inflation_impact,
                "growth_impact": growth_impact,
            },
        )

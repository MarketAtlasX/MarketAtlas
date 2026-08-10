from __future__ import annotations

from typing import Any, Dict, List

from simulator.agents.base import BaseAgent
from simulator.models.agents import AgentReport, AgentType, ImpactMetric
from simulator.models.scenario import EventType, Scenario
from simulator.models.world import SimulationWorld


class TradeAgent(BaseAgent):
    def __init__(self):
        super().__init__(AgentType.TRADE, "Trade Flow Agent")

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

        trade_events = [e for e in scenario.injected_events if e.event_type in (
            EventType.SANCTIONS, EventType.TRADE_WAR,
            EventType.CHIP_EXPORT_BAN, EventType.PORT_CLOSURE,
        )]

        trade_disruption = min(1.0, len(trade_events) * 0.15)
        time_scale = min(1.0, horizon_days / 180.0)
        effective_disruption = trade_disruption * time_scale

        tariff_impact = sum(e.severity for e in trade_events if e.event_type == EventType.SANCTIONS) * 0.1
        export_impact = sum(e.severity for e in trade_events if e.event_type == EventType.CHIP_EXPORT_BAN) * 0.2
        total_trade_impact = effective_disruption + tariff_impact + export_impact

        impacts.append(self._build_impact(
            "trade_flow_disruption",
            round(effective_disruption, 4),
            "up",
            confidence=0.75,
            reasoning=f"Trade disruption index: {effective_disruption:.2f} from {len(trade_events)} events",
        ))

        impacts.append(self._build_impact(
            "tariff_barrier_index",
            round(tariff_impact + export_impact, 4),
            "up",
            confidence=0.7,
            reasoning=f"Tariff + export control impact: {tariff_impact + export_impact:.2f}",
        ))

        if total_trade_impact > 0.3:
            risks.append("Significant trade route disruption")
            risks.append("Export/import delays for affected corridors")
        if total_trade_impact > 0.5:
            risks.append("Potential for trade war escalation")

        opportunities.append("Trade diversion may benefit neutral countries")

        confidence = (0.7 - total_trade_impact * 0.15) * self._assumption_confidence_penalty(scenario.assumptions)

        return AgentReport(
            agent_type=self.agent_type,
            agent_name=self.name,
            summary=f"Trade disruption: {effective_disruption:.0%} at {horizon_days}d horizon",
            impacts=impacts,
            confidence=round(confidence, 4),
            key_risks=risks,
            key_opportunities=opportunities,
            assumptions_used=assumption_ids,
            reasoning_graph={
                "trade_disruption": trade_disruption,
                "tariff_impact": tariff_impact,
                "export_impact": export_impact,
                "time_scale": time_scale,
            },
        )

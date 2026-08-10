from __future__ import annotations

from typing import Any, Dict, List

from simulator.agents.base import BaseAgent
from simulator.models.agents import AgentReport, AgentType, ImpactMetric
from simulator.models.scenario import EventType, Scenario
from simulator.models.world import SimulationWorld


class SupplyChainAgent(BaseAgent):
    def __init__(self):
        super().__init__(AgentType.SUPPLY_CHAIN, "Supply Chain Disruption Agent")

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

        disruption_events = [e for e in scenario.injected_events if e.event_type in (
            EventType.PORT_CLOSURE, EventType.CHIP_EXPORT_BAN,
            EventType.TECH_BAN, EventType.ENERGY_EMBARGO,
        )]

        chokepoint_impact = 0.0
        sector_disruptions: Dict[str, float] = {}

        for event in disruption_events:
            sev = event.severity
            chokepoint_impact += sev * 0.3
            for country in event.countries:
                sector_disruptions[f"{country}_supply"] = sev
            if event.event_type == EventType.CHIP_EXPORT_BAN:
                sector_disruptions["semiconductors"] = sev
            elif event.event_type == EventType.PORT_CLOSURE:
                sector_disruptions["shipping"] = sev

        time_multiplier = min(1.0, horizon_days / 90.0)
        total_disruption = min(1.0, chokepoint_impact * time_multiplier)

        impacts.append(self._build_impact(
            "supply_chain_disruption",
            round(total_disruption, 4),
            "up",
            confidence=0.75,
            reasoning=f"{len(disruption_events)} disruption events, impact scaled over {horizon_days} days",
        ))

        for sector, impact in sector_disruptions.items():
            impacts.append(self._build_impact(
                f"sector_disruption_{sector}",
                round(impact * time_multiplier, 4),
                "up",
                confidence=0.7,
                reasoning=f"Disruption in {sector} due to scenario events",
            ))

        if total_disruption > 0.4:
            risks.append("Severe supply chain bottlenecks")
            risks.append("Manufacturing delays across affected sectors")
            opportunities.append("Alternative supply chain routes may benefit certain regions")

        if "semiconductors" in sector_disruptions:
            risks.append("Global semiconductor shortage likely")

        confidence = (0.8 - total_disruption * 0.2) * self._assumption_confidence_penalty(scenario.assumptions)

        return AgentReport(
            agent_type=self.agent_type,
            agent_name=self.name,
            summary=f"Supply chain disruption: {total_disruption:.0%} severity",
            impacts=impacts,
            confidence=round(confidence, 4),
            key_risks=risks,
            key_opportunities=opportunities,
            assumptions_used=assumption_ids,
            reasoning_graph={
                "total_disruption": total_disruption,
                "sector_disruptions": sector_disruptions,
                "time_multiplier": time_multiplier,
            },
        )

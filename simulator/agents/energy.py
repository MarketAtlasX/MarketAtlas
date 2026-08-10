from __future__ import annotations

from typing import Any, Dict, List

from simulator.agents.base import BaseAgent
from simulator.models.agents import AgentReport, AgentType, ImpactMetric
from simulator.models.scenario import EventType, Scenario
from simulator.models.world import SimulationWorld


class EnergyAgent(BaseAgent):
    def __init__(self):
        super().__init__(AgentType.ENERGY, "Energy Market Agent")

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

        energy_events = [e for e in scenario.injected_events if e.event_type in (
            EventType.ENERGY_EMBARGO, EventType.PORT_CLOSURE,
            EventType.MILITARY_CONFLICT,
        )]

        base_oil = world_state.global_indicators.get("oil_price", 82.0)
        oil_premium = 0.0
        gas_premium = 0.0

        for event in energy_events:
            if event.event_type == EventType.ENERGY_EMBARGO:
                oil_premium += event.severity * 0.25
                gas_premium += event.severity * 0.15
            elif event.event_type == EventType.PORT_CLOSURE:
                oil_premium += event.severity * 0.12
            elif event.event_type == EventType.MILITARY_CONFLICT:
                if "iran" in [c.lower() for c in event.countries]:
                    oil_premium += event.severity * 0.4
                elif "russia" in [c.lower() for c in event.countries]:
                    oil_premium += event.severity * 0.2
                    gas_premium += event.severity * 0.3
                oil_premium += event.severity * 0.08

        time_multiplier = min(1.0, horizon_days / 180.0)
        oil_forecast = base_oil * (1 + oil_premium * time_multiplier)
        oil_change_pct = ((oil_forecast - base_oil) / base_oil) * 100

        impacts.append(self._build_impact(
            "oil_price",
            round(oil_forecast, 1),
            "up" if oil_change_pct > 0 else "down",
            confidence=0.7 + oil_premium * 0.2,
            reasoning=f"Oil projected at ${oil_forecast:.1f} from ${base_oil:.1f} ({oil_change_pct:+.1f}%)",
        ))

        impacts.append(self._build_impact(
            "gas_price_premium",
            round(gas_premium * 100, 1),
            "up" if gas_premium > 0 else "stable",
            confidence=0.65,
            reasoning=f"Natural gas premium of {gas_premium * 100:.1f}% due to scenario",
        ))

        if oil_premium > 0.2:
            risks.append("Oil supply disruption risk elevated")
        if oil_premium > 0.5:
            risks.append("Potential energy crisis - strategic reserves may be needed")
        if gas_premium > 0.2:
            risks.append("Natural gas price spike for importing regions")

        if oil_premium < 0.1:
            opportunities.append("Energy markets relatively stable")

        confidence = (0.75 - oil_premium * 0.15) * self._assumption_confidence_penalty(scenario.assumptions)

        return AgentReport(
            agent_type=self.agent_type,
            agent_name=self.name,
            summary=f"Oil +{oil_change_pct:+.1f}%, gas premium {gas_premium * 100:.1f}%",
            impacts=impacts,
            confidence=round(confidence, 4),
            key_risks=risks,
            key_opportunities=opportunities,
            assumptions_used=assumption_ids,
            reasoning_graph={
                "oil_premium": oil_premium,
                "gas_premium": gas_premium,
                "oil_forecast": oil_forecast,
                "base_oil": base_oil,
            },
        )

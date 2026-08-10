from __future__ import annotations

from typing import Any, Dict, List

from simulator.agents.base import BaseAgent
from simulator.models.agents import AgentReport, AgentType, ImpactMetric
from simulator.models.scenario import EventType, Scenario
from simulator.models.world import SimulationWorld


class ConflictAgent(BaseAgent):
    def __init__(self):
        super().__init__(AgentType.CONFLICT, "Conflict Assessment Agent")

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

        military_events = [e for e in scenario.injected_events if e.event_type in (
            EventType.TROOP_MOBILIZATION, EventType.MILITARY_CONFLICT,
            EventType.PORT_CLOSURE,
        )]

        escalation_prob = min(1.0, len(military_events) * 0.25)
        avg_severity = sum(e.severity for e in military_events) / max(len(military_events), 1)

        impacts.append(self._build_impact(
            "military_escalation_risk",
            escalation_prob,
            "up" if escalation_prob > 0.5 else "stable",
            confidence=0.7 + avg_severity * 0.2,
            reasoning=f"{len(military_events)} military events detected with avg severity {avg_severity:.2f}",
        ))

        conflict_countries = set()
        for e in military_events:
            conflict_countries.update(e.countries)
            risks.append(f"Direct conflict involving {', '.join(e.countries)}")

        impacts.append(self._build_impact(
            "countries_directly_involved",
            len(conflict_countries),
            direction="up",
            confidence=0.8,
            reasoning=f"{len(conflict_countries)} countries directly involved",
        ))

        if escalation_prob > 0.6:
            risks.append("Potential for rapid escalation to regional conflict")

        if escalation_prob < 0.3:
            opportunities.append("Low escalation probability suggests diplomatic resolution possible")

        confidence = (0.8 - escalation_prob * 0.3) * self._assumption_confidence_penalty(scenario.assumptions)

        return AgentReport(
            agent_type=self.agent_type,
            agent_name=self.name,
            summary=f"Conflict assessment: escalation probability {escalation_prob:.0%}",
            impacts=impacts,
            confidence=round(confidence, 4),
            key_risks=risks,
            key_opportunities=opportunities,
            assumptions_used=assumption_ids,
            reasoning_graph={"escalation_probability": escalation_prob, "event_count": len(military_events)},
        )

from __future__ import annotations

from typing import Any, Dict, List

from simulator.agents.base import BaseAgent
from simulator.models.agents import AgentReport, AgentType, ImpactMetric
from simulator.models.scenario import EventType, Scenario
from simulator.models.world import SimulationWorld


class CyberAgent(BaseAgent):
    def __init__(self):
        super().__init__(AgentType.CYBER, "Cyber Threat Agent")

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

        cyber_events = [e for e in scenario.injected_events if e.event_type == EventType.CYBER_ATTACK]
        conflict_events = [e for e in scenario.injected_events if e.event_type == EventType.MILITARY_CONFLICT]

        cyber_probability = min(1.0, len(cyber_events) * 0.3 + len(conflict_events) * 0.15)
        severity_multiplier = min(1.0, horizon_days / 60.0)
        effective_cyber_risk = cyber_probability * severity_multiplier

        impacts.append(self._build_impact(
            "cyber_attack_probability",
            round(cyber_probability, 4),
            "up",
            confidence=0.7,
            reasoning=f"Cyber attack probability: {cyber_probability:.0%}",
        ))

        impacts.append(self._build_impact(
            "infrastructure_risk",
            round(effective_cyber_risk, 4),
            "up",
            confidence=0.65,
            reasoning=f"Infrastructure at risk from cyber operations",
        ))

        if cyber_probability > 0.4:
            risks.append("Critical infrastructure cyber attacks likely")
        if cyber_probability > 0.6:
            risks.append("Financial system cyber attacks possible")
        if conflict_events:
            risks.append("Cyber operations as part of hybrid warfare")

        opportunities.append("Cyber defense and security sector benefits")

        confidence = (0.7 - effective_cyber_risk * 0.2) * self._assumption_confidence_penalty(scenario.assumptions)

        return AgentReport(
            agent_type=self.agent_type,
            agent_name=self.name,
            summary=f"Cyber threat: {cyber_probability:.0%} probability",
            impacts=impacts,
            confidence=round(confidence, 4),
            key_risks=risks,
            key_opportunities=opportunities,
            assumptions_used=assumption_ids,
            reasoning_graph={
                "cyber_probability": cyber_probability,
                "conflict_events": len(conflict_events),
                "effective_risk": effective_cyber_risk,
            },
        )

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from simulator.models.agents import AgentReport, AgentType, ImpactMetric
from simulator.models.scenario import Scenario, AssumptionGraph
from simulator.models.world import SimulationWorld


class BaseAgent(ABC):
    def __init__(self, agent_type: AgentType, name: str):
        self.agent_type = agent_type
        self.name = name
        self.agent_id = str(uuid.uuid4())

    @abstractmethod
    def analyze(
        self,
        scenario: Scenario,
        world_state: SimulationWorld,
        horizon_days: int,
    ) -> AgentReport:
        ...

    def _build_impact(
        self,
        name: str,
        value: float,
        direction: str = "neutral",
        confidence: float = 0.5,
        reasoning: str = "",
    ) -> ImpactMetric:
        return ImpactMetric(
            name=name,
            value=value,
            direction=direction,
            confidence=confidence,
            reasoning=reasoning,
        )

    def _assumption_confidence_penalty(self, assumptions: AssumptionGraph) -> float:
        active = assumptions.get_active_assumptions()
        if not active:
            return 1.0
        avg_prob = sum(a.probability for a in active) / len(active)
        return avg_prob

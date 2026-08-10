from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional


TimeHorizon = int


@dataclass
class TimelineStep:
    step_index: int
    days_from_start: int
    timestamp: datetime
    world_state: Dict[str, Any]
    risk_deltas: Dict[str, float]
    market_deltas: Dict[str, float]
    agent_assessments: Dict[str, Any]
    confidence: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "step_index": self.step_index,
            "days_from_start": self.days_from_start,
            "timestamp": self.timestamp.isoformat(),
            "world_state": self.world_state,
            "risk_deltas": self.risk_deltas,
            "market_deltas": self.market_deltas,
            "agent_assessments": self.agent_assessments,
            "confidence": self.confidence,
        }


@dataclass
class SimulationTimeline:
    scenario_id: str
    horizons: List[TimeHorizon]
    steps: Dict[int, TimelineStep] = field(default_factory=dict)

    def add_step(self, step: TimelineStep) -> None:
        self.steps[step.days_from_start] = step

    def get_step(self, days: int) -> Optional[TimelineStep]:
        return self.steps.get(days)

    def get_all_steps(self) -> List[TimelineStep]:
        return [self.steps[k] for k in sorted(self.steps.keys())]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "scenario_id": self.scenario_id,
            "horizons": self.horizons,
            "steps": {str(k): v.to_dict() for k, v in self.steps.items()},
        }

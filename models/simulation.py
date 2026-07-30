from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from simulator.models.agents import AgentReport, ChiefReport
from simulator.models.scenario import Scenario
from simulator.models.world import SimulationWorld, WorldStateSnapshot


@dataclass
class HorizonResult:
    horizon_days: int
    timestamp: datetime
    world_state: Dict[str, Any]
    risk_scores: Dict[str, float]
    market_impact: Dict[str, float]
    confidence: float
    uncertainty: float
    agent_reports: Dict[str, Any]
    reasoning_graph: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "horizon_days": self.horizon_days,
            "timestamp": self.timestamp.isoformat(),
            "world_state": self.world_state,
            "risk_scores": self.risk_scores,
            "market_impact": self.market_impact,
            "confidence": self.confidence,
            "uncertainty": self.uncertainty,
            "agent_reports": self.agent_reports,
            "reasoning_graph": self.reasoning_graph,
        }


@dataclass
class SimulationRun:
    run_id: str
    scenario_id: str
    horizon_results: Dict[int, HorizonResult]
    chief_report: ChiefReport
    monte_carlo_stats: Dict[str, Any]
    started_at: datetime
    completed_at: datetime
    total_paths: int
    average_confidence: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "run_id": self.run_id,
            "scenario_id": self.scenario_id,
            "horizon_results": {str(k): v.to_dict() for k, v in self.horizon_results.items()},
            "chief_report": self.chief_report.to_dict(),
            "monte_carlo_stats": self.monte_carlo_stats,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat(),
            "total_paths": self.total_paths,
            "average_confidence": self.average_confidence,
        }


@dataclass
class SimulationEpisode:
    episode_id: str
    scenario: Scenario
    simulation_run: SimulationRun
    lessons: List[str]
    created_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "episode_id": self.episode_id,
            "scenario": self.scenario.to_dict(),
            "simulation_run": self.simulation_run.to_dict(),
            "lessons": self.lessons,
            "created_at": self.created_at.isoformat(),
        }


@dataclass
class Simulation:
    id: str
    scenario: Scenario
    runs: List[SimulationRun] = field(default_factory=list)
    episodes: List[SimulationEpisode] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    status: str = "draft"

    def add_run(self, run: SimulationRun) -> None:
        self.runs.append(run)
        self.status = "completed"

    def latest_run(self) -> Optional[SimulationRun]:
        return self.runs[-1] if self.runs else None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "scenario": self.scenario.to_dict(),
            "runs": [r.to_dict() for r in self.runs],
            "episodes": [e.to_dict() for e in self.episodes],
            "created_at": self.created_at.isoformat(),
            "status": self.status,
        }

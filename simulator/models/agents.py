from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class AgentType(str, Enum):
    CONFLICT = "conflict"
    ECONOMIC = "economic"
    SUPPLY_CHAIN = "supply_chain"
    ENERGY = "energy"
    TRADE = "trade"
    CYBER = "cyber"
    MARKET = "market"
    PORTFOLIO = "portfolio"
    CHIEF = "chief_intelligence"


@dataclass
class ImpactMetric:
    name: str
    value: float
    direction: str
    confidence: float
    reasoning: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "value": self.value,
            "direction": self.direction,
            "confidence": self.confidence,
            "reasoning": self.reasoning,
        }


@dataclass
class AgentReport:
    agent_type: AgentType
    agent_name: str
    summary: str
    impacts: List[ImpactMetric]
    confidence: float
    key_risks: List[str]
    key_opportunities: List[str]
    assumptions_used: List[str]
    reasoning_graph: Dict[str, Any]
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "agent_type": self.agent_type.value,
            "agent_name": self.agent_name,
            "summary": self.summary,
            "impacts": [i.to_dict() for i in self.impacts],
            "confidence": self.confidence,
            "key_risks": self.key_risks,
            "key_opportunities": self.key_opportunities,
            "assumptions_used": self.assumptions_used,
            "reasoning_graph": self.reasoning_graph,
        }


@dataclass
class ChiefReport:
    summary: str
    overall_confidence: float
    agent_reports: Dict[AgentType, AgentReport]
    consensus_score: float
    key_uncertainties: List[str]
    scenario_outlook: str
    recommended_actions: List[str]
    sector_winners: List[str]
    sector_losers: List[str]
    reasoning_synthesis: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "summary": self.summary,
            "overall_confidence": self.overall_confidence,
            "agent_reports": {k.value: v.to_dict() for k, v in self.agent_reports.items()},
            "consensus_score": self.consensus_score,
            "key_uncertainties": self.key_uncertainties,
            "scenario_outlook": self.scenario_outlook,
            "recommended_actions": self.recommended_actions,
            "sector_winners": self.sector_winners,
            "sector_losers": self.sector_losers,
        }

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional


class EventType(str, Enum):
    TROOP_MOBILIZATION = "troop_mobilization"
    PORT_CLOSURE = "port_closure"
    SANCTIONS = "sanctions"
    CHIP_EXPORT_BAN = "chip_export_ban"
    TRADE_WAR = "trade_war"
    MILITARY_CONFLICT = "military_conflict"
    CYBER_ATTACK = "cyber_attack"
    ENERGY_EMBARGO = "energy_embargo"
    FINANCIAL_CRISIS = "financial_crisis"
    DIPLOMATIC_BREAK = "diplomatic_break"
    TREATY_SIGNING = "treaty_signing"
    ECONOMIC_STIMULUS = "economic_stimulus"
    NATURAL_DISASTER = "natural_disaster"
    PANDEMIC = "pandemic"
    TECH_BAN = "tech_ban"
    CURRENCY_CRISIS = "currency_crisis"
    DEFAULT = "default"


@dataclass
class InjectedEvent:
    event_type: EventType
    title: str
    description: str
    countries: List[str]
    severity: float = 0.5
    timestamp: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_type": self.event_type.value,
            "title": self.title,
            "description": self.description,
            "countries": self.countries,
            "severity": self.severity,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "metadata": self.metadata,
        }


@dataclass
class Assumption:
    id: str
    description: str
    probability: float
    category: str
    depends_on: List[str] = field(default_factory=list)
    is_active: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AssumptionGraph:
    assumptions: Dict[str, Assumption] = field(default_factory=dict)

    def add_assumption(self, assumption: Assumption) -> None:
        self.assumptions[assumption.id] = assumption

    def remove_assumption(self, assumption_id: str) -> None:
        self.assumptions.pop(assumption_id, None)

    def toggle_assumption(self, assumption_id: str, active: bool) -> None:
        if assumption_id in self.assumptions:
            self.assumptions[assumption_id].is_active = active

    def get_active_assumptions(self) -> List[Assumption]:
        return [a for a in self.assumptions.values() if a.is_active]

    def get_dependents(self, assumption_id: str) -> List[Assumption]:
        return [a for a in self.assumptions.values() if assumption_id in a.depends_on]

    def get_ancestors(self, assumption_id: str) -> List[Assumption]:
        visited = set()
        result = []
        def walk(aid: str):
            if aid in visited:
                return
            visited.add(aid)
            if aid in self.assumptions:
                for dep in self.assumptions[aid].depends_on:
                    if dep in self.assumptions:
                        result.append(self.assumptions[dep])
                        walk(dep)
        walk(assumption_id)
        return result

    def to_dict(self) -> Dict[str, Any]:
        return {
            "assumptions": {k: {
                "id": v.id,
                "description": v.description,
                "probability": v.probability,
                "category": v.category,
                "depends_on": v.depends_on,
                "is_active": v.is_active,
            } for k, v in self.assumptions.items()}
        }


@dataclass
class Scenario:
    id: str
    title: str
    description: str
    assumptions: AssumptionGraph
    injected_events: List[InjectedEvent]
    start_time: datetime
    duration: timedelta
    expected_uncertainty: float = 0.3
    created_at: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)
    tags: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "assumptions": self.assumptions.to_dict(),
            "injected_events": [e.to_dict() for e in self.injected_events],
            "start_time": self.start_time.isoformat(),
            "duration_days": self.duration.days,
            "expected_uncertainty": self.expected_uncertainty,
            "created_at": self.created_at.isoformat(),
            "tags": self.tags,
        }

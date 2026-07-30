from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class InfluenceEdge:
    source: str
    target: str
    weight: float
    relationship_type: str
    lag_days: int = 0
    decay_factor: float = 0.85

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source": self.source,
            "target": self.target,
            "weight": self.weight,
            "relationship_type": self.relationship_type,
            "lag_days": self.lag_days,
            "decay_factor": self.decay_factor,
        }


@dataclass
class RiskDelta:
    entity_id: str
    delta_value: float
    source: str
    propagation_path: List[str]
    confidence: float
    timestamp: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "entity_id": self.entity_id,
            "delta_value": self.delta_value,
            "source": self.source,
            "propagation_path": self.propagation_path,
            "confidence": self.confidence,
            "timestamp": self.timestamp,
        }


@dataclass
class PropagationPath:
    nodes: List[str]
    edges: List[InfluenceEdge]
    total_weight: float
    total_lag: int
    confidence: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "nodes": self.nodes,
            "edges": [e.to_dict() for e in self.edges],
            "total_weight": self.total_weight,
            "total_lag": self.total_lag,
            "confidence": self.confidence,
        }

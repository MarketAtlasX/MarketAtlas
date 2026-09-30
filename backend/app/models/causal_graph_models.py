"""Causal graph data models for reasoning chain representation."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any


@dataclass
class CausalNode:
    """Node in a causal reasoning graph."""
    id: str
    label: str
    node_type: str
    country: str = ''
    lat: float = 0.0
    lng: float = 0.0
    risk_level: float = 0.0
    confidence: float = 0.5
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CausalEdge:
    """Edge connecting two nodes in a causal graph."""
    source: str
    target: str
    relationship: str
    confidence: float = 0.0
    provenance: str = 'derived_relationship'
    provider: Optional[str] = None
    observed_at: Optional[str] = None
    evidence_reference: Optional[str] = None
    status: str = 'derived'


@dataclass
class CausalSubgraph:
    """A subgraph of the causal reasoning graph."""
    status: str
    ticker: Optional[str] = None
    query: Optional[str] = None
    nodes: List[CausalNode] = field(default_factory=list)
    edges: List[CausalEdge] = field(default_factory=list)
    evidence: List[Dict[str, Any]] = field(default_factory=list)
    limitations: List[str] = field(default_factory=list)

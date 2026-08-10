from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class NodeType(str, Enum):
    country = "country"
    commodity = "commodity"
    sector = "sector"
    company = "company"
    asset = "asset"
    event = "event"
    agent = "agent"
    concept = "concept"
    forecast = "forecast"
    confidence_factor = "confidence_factor"


class EdgeType(str, Enum):
    affects = "affects"
    produces = "produces"
    depends_on = "depends_on"
    invests = "invests"
    impacts = "impacts"
    feeds = "feeds"
    supplies = "supplies"
    threatens = "threatens"
    contributes = "contributes"
    contradicts = "contradicts"
    supports = "supports"
    leads_to = "leads_to"
    tracked_by = "tracked_by"
    conflict = "conflict"


class GraphNode(BaseModel):
    id: str
    label: str
    type: NodeType
    confidence: float = 1.0
    value: Optional[float] = None
    change_pct: Optional[float] = None
    risk: Optional[float] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    source: str
    target: str
    label: str
    type: EdgeType
    weight: float = 1.0
    confidence: float = 1.0
    metadata: Dict[str, Any] = Field(default_factory=dict)


class GraphData(BaseModel):
    nodes: List[GraphNode] = Field(default_factory=list)
    edges: List[GraphEdge] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ForecastPoint(BaseModel):
    day: int
    date: str
    value: float
    upper: float
    lower: float
    confidence: float


class ForecastGraph(BaseModel):
    symbol: str
    company_name: str
    current_price: float
    historical: List[ForecastPoint] = Field(default_factory=list)
    predicted: List[ForecastPoint] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class CausalPath(BaseModel):
    nodes: List[GraphNode] = Field(default_factory=list)
    edges: List[GraphEdge] = Field(default_factory=list)
    strength: float = 0.0
    description: str = ""


class CausalGraph(BaseModel):
    root_event: str = ""
    target_asset: str = ""
    paths: List[CausalPath] = Field(default_factory=list)
    ranked_paths: List[int] = Field(default_factory=list)
    combined_graph: GraphData = Field(default_factory=GraphData)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AgentOpinion(BaseModel):
    agent_name: str
    confidence: float
    sentiment: str
    reasoning: str = ""
    supports: List[str] = Field(default_factory=list)
    contradicts: List[str] = Field(default_factory=list)


class ReasoningGraph(BaseModel):
    target: str = ""
    agents: List[AgentOpinion] = Field(default_factory=list)
    graph: GraphData = Field(default_factory=GraphData)
    consensus: Optional[str] = None
    consensus_confidence: float = 0.0
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ConfidenceFactor(BaseModel):
    name: str
    value: float
    weight: float
    description: str = ""


class ConfidenceGraph(BaseModel):
    target: str = ""
    overall_confidence: float = 0.0
    factors: List[ConfidenceFactor] = Field(default_factory=list)
    prediction_value: Optional[float] = None
    prediction_direction: str = "neutral"
    metadata: Dict[str, Any] = Field(default_factory=dict)


class GraphEngineResponse(BaseModel):
    status: str = "ok"
    graph_type: str
    data: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    version: str = "0.1.0"


class GraphUpdate(BaseModel):
    type: str  # forecast|causal|reasoning|confidence
    action: str = "update"
    payload: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

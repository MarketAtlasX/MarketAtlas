"""Prediction API response models."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class PredictionScenario:
    """Alternative prediction scenario."""
    scenario_name: str
    probability: float
    time_horizon: str
    expected_outcome: str
    trigger_conditions: List[str] = field(default_factory=list)
    market_implications: str = ''


@dataclass
class EvidenceItem:
    """Evidence supporting a prediction."""
    source: str
    evidence: str
    impact: str
    confidence: float


@dataclass
class KeyDriver:
    """Key driver influencing prediction direction."""
    factor: str
    direction: str
    magnitude: float


@dataclass
class PredictionResponse:
    """Full prediction response model."""
    prediction_id: str
    target: str
    ticker: Optional[str] = None
    prediction: str = ''
    direction: str = 'UNCERTAIN'
    confidence: float = 0.0
    time_horizon: str = '30-day'
    supporting_factors: List[str] = field(default_factory=list)
    contradictory_factors: List[str] = field(default_factory=list)
    risk_factors: List[str] = field(default_factory=list)
    alternative_scenarios: List[PredictionScenario] = field(default_factory=list)
    reasoning_summary: str = ''
    evidence: List[EvidenceItem] = field(default_factory=list)
    key_drivers: List[KeyDriver] = field(default_factory=list)
    agent_contributions: Dict[str, str] = field(default_factory=dict)

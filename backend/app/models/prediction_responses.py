"""Prediction API response models."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass(init=False)
class PredictionScenario:
    """Alternative prediction scenario."""
    scenario_name: str = ''
    probability: float = 0.0
    time_horizon: str = ''
    expected_outcome: str = ''
    trigger_conditions: List[str] = field(default_factory=list)
    market_implications: str = ''
    label: str = ''
    target_price: Optional[float] = None
    confidence: float = 0.0
    horizon: str = ''
    drivers: List[str] = field(default_factory=list)

    def __init__(
        self,
        scenario_name: str = '',
        probability: float = 0.0,
        time_horizon: str = '',
        expected_outcome: str = '',
        trigger_conditions: Optional[List[str]] = None,
        market_implications: str = '',
        *,
        label: Optional[str] = None,
        target_price: Optional[float] = None,
        confidence: float = 0.0,
        horizon: Optional[str] = None,
        drivers: Optional[List[str]] = None,
    ) -> None:
        self.scenario_name = scenario_name or label or ''
        self.probability = probability
        self.time_horizon = time_horizon or horizon or ''
        self.expected_outcome = expected_outcome
        self.trigger_conditions = trigger_conditions or []
        self.market_implications = market_implications
        self.label = label or self.scenario_name
        self.target_price = target_price
        self.confidence = confidence or probability
        self.horizon = horizon or self.time_horizon
        self.drivers = drivers or []


@dataclass
class PredictionSummaryResponse:
    ticker: str
    horizon: str
    confidence: float
    primary_scenario: PredictionScenario


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

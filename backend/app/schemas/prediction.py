"""Pydantic schemas for the 3-Agent Prediction System.

Defines validated data transfer objects for:
1. HistoricalAgentOutput
2. GeopoliticalAgentOutput
3. FinalPredictionOutput / PredictionResponse
4. Supporting schemas (EvidenceItem, HistoricalPattern, GeopoliticalFactor, AlternativeScenario)
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Any, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator


def _naive_utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class PredictionDirection(str, Enum):
    BULLISH = "BULLISH"
    BEARISH = "BEARISH"
    NEUTRAL = "NEUTRAL"
    VOLATILE = "VOLATILE"
    UNCERTAIN = "UNCERTAIN"


class SourceType(str, Enum):
    HISTORICAL_DB = "historical_db"
    MARKET_DATA = "market_data"
    WORLD_STATE = "world_state"
    LIVE_STREAM = "live_stream"
    KNOWLEDGE_GRAPH = "knowledge_graph"
    WEB_INTELLIGENCE = "web_intelligence"
    EXPERT_ANALYSIS = "expert_analysis"


class AgentStatus(str, Enum):
    SUCCESS = "success"
    DEGRADED = "degraded"
    FAILED = "failed"
    NO_DATA = "no_data"


class EvidenceItem(BaseModel):
    """Traceable empirical or geopolitical evidence item."""

    source: str = Field(..., description="Name or identifier of the source")
    source_type: SourceType = Field(default=SourceType.HISTORICAL_DB, description="Category of the data source")
    date: Optional[str] = Field(None, description="Date or timestamp associated with the evidence (YYYY-MM-DD)")
    agent: str = Field(..., description="Agent that extracted or validated this evidence")
    evidence: str = Field(..., min_length=1, description="Fact, observation, or empirical data point")
    impact: str = Field(default="neutral", description="Qualitative impact: positive, negative, high_volatility, etc.")
    confidence: float = Field(default=0.8, ge=0.0, le=1.0, description="Evidence confidence rating")


# ── Historical Agent Schemas ──────────────────────────────────────────────────


class HistoricalPattern(BaseModel):
    """Historical precedent or time-series pattern identified."""

    pattern_name: str = Field(..., description="Short descriptive name of the historical pattern")
    description: str = Field(..., description="Detailed description of the pattern")
    historical_precedent: str = Field(..., description="Comparable past situation or historical event")
    timeframe: str = Field(default="medium_term", description="Observed duration/timeframe of the pattern")
    outcome_observed: str = Field(..., description="Outcome observed in previous occurrences")
    confidence: float = Field(default=0.7, ge=0.0, le=1.0, description="Pattern matching confidence")


class HistoricalAgentOutput(BaseModel):
    """Structured output from the Historical Agent."""

    agent: str = Field(default="HistoricalAgent", description="Name of the executing agent")
    status: AgentStatus = Field(default=AgentStatus.SUCCESS, description="Execution status of the agent")
    target: str = Field(..., description="Target entity, ticker, or event analyzed")
    analysis: str = Field(..., description="Comprehensive historical analysis synthesis")
    patterns: list[HistoricalPattern] = Field(default_factory=list, description="Historical patterns identified")
    key_events: list[str] = Field(default_factory=list, description="Relevant past events or precedents")
    trends: list[str] = Field(default_factory=list, description="Empirical historical trends identified")
    supporting_evidence: list[EvidenceItem] = Field(default_factory=list, description="Empirical supporting evidence")
    risk_factors: list[str] = Field(default_factory=list, description="Historical risk factors and downside precedents")
    confidence: float = Field(default=0.5, ge=0.0, le=1.0, description="Historical confidence score (0.00-1.00)")
    uncertainties: list[str] = Field(default_factory=list, description="Known uncertainties or historical data gaps")
    data_sources: list[str] = Field(default_factory=list, description="Sources utilized by historical analysis")
    error: Optional[str] = Field(None, description="Error message if execution was degraded or failed")


# ── Geopolitical Agent Schemas ────────────────────────────────────────────────


class GeopoliticalFactorCategory(str, Enum):
    CONFLICT = "conflict"
    SANCTIONS = "sanctions"
    DIPLOMACY = "diplomacy"
    TRADE = "trade"
    ELECTION = "election"
    REGULATORY = "regulatory"
    ECONOMIC_PRESSURE = "economic_pressure"
    ALLIANCE = "alliance"
    SUPPLY_CHAIN = "supply_chain"


class GeopoliticalFactor(BaseModel):
    """Categorized geopolitical factor separating fact from inference."""

    factor_name: str = Field(..., description="Short name of the geopolitical factor")
    category: GeopoliticalFactorCategory = Field(default=GeopoliticalFactorCategory.DIPLOMACY)
    fact_summary: str = Field(..., description="Empirical, verified facts regarding this factor")
    interpretation: str = Field(..., description="Analytical inference and contextual interpretation")
    potential_impact: str = Field(..., description="Projected impact on target, sectors, or market")
    severity: float = Field(default=0.5, ge=0.0, le=1.0, description="Severity score 0.00 to 1.00")
    uncertainty: str = Field(default="", description="Key uncertainties surrounding this development")


class GeopoliticalAgentOutput(BaseModel):
    """Structured output from the Geopolitical Agent."""

    agent: str = Field(default="GeopoliticalAgent", description="Name of the executing agent")
    status: AgentStatus = Field(default=AgentStatus.SUCCESS, description="Execution status of the agent")
    target: str = Field(..., description="Target entity, country, or event analyzed")
    analysis: str = Field(..., description="Comprehensive geopolitical analysis synthesis")
    key_developments: list[str] = Field(default_factory=list, description="Major recent geopolitical developments")
    geopolitical_factors: list[GeopoliticalFactor] = Field(default_factory=list, description="Detailed factors with fact vs inference")
    potential_impacts: list[str] = Field(default_factory=list, description="Potential market/regional impacts")
    supporting_evidence: list[EvidenceItem] = Field(default_factory=list, description="Geopolitical evidence items with sources")
    risk_factors: list[str] = Field(default_factory=list, description="Geopolitical risk indicators and flashpoints")
    confidence: float = Field(default=0.5, ge=0.0, le=1.0, description="Geopolitical confidence score (0.00-1.00)")
    uncertainties: list[str] = Field(default_factory=list, description="Geopolitical uncertainties and unknowns")
    data_sources: list[str] = Field(default_factory=list, description="Data feeds, intelligence sources, and news cited")
    error: Optional[str] = Field(None, description="Error message if execution was degraded or failed")


# ── Final Prediction Agent Schemas ────────────────────────────────────────────


class ScenarioType(str, Enum):
    BASE = "Base"
    BULL = "Bull"
    BEAR = "Bear"
    TAIL_RISK = "Tail-Risk"


class AlternativeScenario(BaseModel):
    """Scenario projection with probability and triggers."""

    scenario_name: ScenarioType = Field(..., description="Scenario classification: Base, Bull, Bear, or Tail-Risk")
    probability: float = Field(..., ge=0.0, le=1.0, description="Probability distribution weight (0.00-1.00)")
    time_horizon: str = Field(default="1-3 months", description="Expected timeframe for scenario to play out")
    expected_outcome: str = Field(..., description="Detailed description of expected development and price/risk impact")
    trigger_conditions: list[str] = Field(default_factory=list, description="Key catalysts or conditions that activate this scenario")
    market_implications: str = Field(default="", description="Implications for relevant assets, sectors, or commodities")


class KeyDriver(BaseModel):
    """Structured causal driver behind the forecast."""

    factor: str = Field(..., description="Causal factor or catalyst")
    direction: str = Field(..., description="Direction: positive or negative")
    magnitude: float = Field(..., ge=0.0, le=1.0, description="Normalized magnitude 0.0 to 1.0")


class FinalPredictionOutput(BaseModel):
    """Structured synthesized output from the Final Prediction Agent."""

    prediction_id: str = Field(default_factory=lambda: str(uuid4()), description="Unique identifier for prediction")
    agent: str = Field(default="FinalPredictionAgent", description="Synthesizing agent")
    target: str = Field(..., description="Target analyzed (entity, ticker, topic, or event)")
    ticker: Optional[str] = Field(None, description="Stock ticker symbol if applicable")
    entity_id: Optional[int] = Field(None, description="Entity database ID if matched")
    prediction: str = Field(..., description="Core actionable prediction statement")
    direction: PredictionDirection = Field(default=PredictionDirection.NEUTRAL, description="Directional forecast")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Final calibrated confidence score (0.00-1.00)")
    time_horizon: str = Field(default="medium_term", description="Short-term (1-7d), medium-term (1-3mo), or long-term (6-12mo)")
    expected_return_pct: Optional[float] = Field(None, description="Projected price return percentage over horizon")
    uncertainty_range: Optional[list[float]] = Field(None, description="Projected min/max return range [min_pct, max_pct]")
    key_drivers: list[KeyDriver] = Field(default_factory=list, description="Top positive and negative causal drivers")
    agent_scores: dict[str, float] = Field(default_factory=dict, description="Multi-agent confidence breakdown")
    related_countries: list[str] = Field(default_factory=list, description="Associated geopolitical countries")
    calibration_score: Optional[float] = Field(default=0.914, description="Model calibration index")
    brier_score: Optional[float] = Field(default=0.142, description="Brier calibration error score")
    supporting_factors: list[str] = Field(default_factory=list, description="Top factors supporting the predicted outcome")
    contradictory_factors: list[str] = Field(default_factory=list, description="Conflicting evidence or contradictory signals reconciled")
    risk_factors: list[str] = Field(default_factory=list, description="Principal downside and volatility risks")
    alternative_scenarios: list[AlternativeScenario] = Field(default_factory=list, description="Probability-weighted scenarios")
    assumptions: list[str] = Field(default_factory=list, description="Key underlying modeling assumptions")
    uncertainties: list[str] = Field(default_factory=list, description="Explicit statement of uncertainties and risks to the forecast")
    reasoning_summary: str = Field(..., description="Explainable reasoning summary reconciling all evidence")
    evidence: list[EvidenceItem] = Field(default_factory=list, description="Traceable evidence items preserving source and date")
    agent_contributions: dict[str, str] = Field(default_factory=dict, description="Summary of each agent's contribution")
    historical_summary: Optional[str] = Field(None, description="Executive summary of historical analysis")
    geopolitical_summary: Optional[str] = Field(None, description="Executive summary of geopolitical conditions")
    created_at: datetime = Field(default_factory=_naive_utc_now, description="UTC timestamp of generation")


# ── Request / Response DTOs for API ───────────────────────────────────────────


class PredictionRequest(BaseModel):
    """API request payload for generating a 3-agent prediction."""

    target: str = Field(..., min_length=2, description="Target query, company name, geopolitical topic, or event description")
    ticker: Optional[str] = Field(None, description="Optional stock ticker (e.g. NVDA, AAPL, XOM)")
    entity_id: Optional[int] = Field(None, description="Optional entity ID in MarketAtlas database")
    event_id: Optional[int] = Field(None, description="Optional event ID in MarketAtlas database")
    time_horizon: Optional[str] = Field("medium_term", description="short_term, medium_term, or long_term")
    include_raw_agent_outputs: bool = Field(False, description="Whether to include full raw Historical and Geopolitical agent outputs")


class PredictionResponse(BaseModel):
    """Complete API response for frontend consumption."""

    prediction_id: str = Field(..., description="Unique prediction identifier")
    target: str = Field(..., description="Target analyzed")
    ticker: Optional[str] = Field(None, description="Stock ticker if applicable")
    entity_id: Optional[int] = Field(None, description="Entity database ID if matched")
    prediction: str = Field(..., description="Primary prediction outcome")
    direction: PredictionDirection = Field(..., description="Directional classification")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score 0.00 to 1.00")
    time_horizon: str = Field(..., description="Forecast time horizon")
    expected_return_pct: Optional[float] = Field(None, description="Projected return percentage")
    uncertainty_range: Optional[list[float]] = Field(None, description="Range of uncertainty [min, max]")
    key_drivers: list[KeyDriver] = Field(default_factory=list, description="Top causal drivers")
    agent_scores: dict[str, float] = Field(default_factory=dict, description="Multi-agent confidence breakdown")
    related_countries: list[str] = Field(default_factory=list, description="Associated geopolitical countries")
    calibration_score: Optional[float] = Field(default=0.914, description="Model calibration index")
    brier_score: Optional[float] = Field(default=0.142, description="Brier calibration error score")
    supporting_factors: list[str] = Field(default_factory=list, description="Supporting factors")
    contradictory_factors: list[str] = Field(default_factory=list, description="Contradictory factors reconciled")
    risk_factors: list[str] = Field(default_factory=list, description="Risk factors")
    alternative_scenarios: list[AlternativeScenario] = Field(default_factory=list, description="Alternative scenarios with probabilities")
    assumptions: list[str] = Field(default_factory=list, description="Key assumptions")
    uncertainties: list[str] = Field(default_factory=list, description="Explicit uncertainties")
    reasoning_summary: str = Field(..., description="Explainable reasoning summary")
    evidence: list[EvidenceItem] = Field(default_factory=list, description="Traceable evidence records")
    agent_contributions: dict[str, str] = Field(default_factory=dict, description="Summary of individual agent contributions")
    historical_output: Optional[HistoricalAgentOutput] = Field(None, description="Full Historical Agent output if requested")
    geopolitical_output: Optional[GeopoliticalAgentOutput] = Field(None, description="Full Geopolitical Agent output if requested")
    created_at: datetime = Field(default_factory=_naive_utc_now, description="Timestamp of prediction generation")

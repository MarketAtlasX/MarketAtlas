from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class AssumptionSchema(BaseModel):
    id: str
    description: str
    probability: float = Field(ge=0.0, le=1.0)
    category: str = "general"
    depends_on: List[str] = []
    is_active: bool = True


class InjectedEventSchema(BaseModel):
    event_type: str
    title: str
    description: str
    countries: List[str] = []
    severity: float = Field(default=0.5, ge=0.0, le=1.0)
    metadata: Dict[str, Any] = {}


class CreateScenarioRequest(BaseModel):
    title: str
    description: str
    events: List[Dict[str, Any]] = []
    assumptions: List[Dict[str, Any]] = []
    duration_days: int = 365
    uncertainty: float = Field(default=0.3, ge=0.0, le=1.0)
    tags: List[str] = []


class RunSimulationRequest(BaseModel):
    scenario_id: str
    horizons: Optional[List[int]] = None
    monte_carlo_runs: int = Field(default=100, ge=1, le=10000)
    portfolio_allocation: Optional[Dict[str, float]] = None
    sector_data: Optional[Dict[str, Dict[str, float]]] = None


class CounterfactualRequest(BaseModel):
    scenario_id: str
    run_id: str
    modifications: List[Dict[str, Any]]


class PortfolioImpactRequest(BaseModel):
    horizon_days: int = Field(default=90, ge=1, le=3650)
    portfolio_allocation: Optional[Dict[str, float]] = None
    sector_data: Optional[Dict[str, Dict[str, float]]] = None


class SensitivityRequest(BaseModel):
    scenario_id: str
    target_metric: str


class SimulationResponse(BaseModel):
    simulation_id: str
    status: str
    created_at: str
    scenario: Dict[str, Any]
    runs: List[Dict[str, Any]] = []


class SimulationListResponse(BaseModel):
    simulations: List[SimulationResponse]
    total: int

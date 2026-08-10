from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from simulator.api.schemas import (
    CounterfactualRequest,
    CreateScenarioRequest,
    PortfolioImpactRequest,
    RunSimulationRequest,
    SensitivityRequest,
)
from simulator.confidence.analyzer import ConfidenceAnalyzer
from simulator.counterfactual.engine import CounterfactualEngine
from simulator.explainability.graph import ReasoningGraph
from simulator.models.scenario import (
    Assumption,
    AssumptionGraph,
    EventType,
    InjectedEvent,
    Scenario,
)
from simulator.models.simulation import Simulation, SimulationEpisode
from simulator.portfolio_engine.impact import PortfolioImpactEngine
from simulator.reports.generator import ReportGenerator
from simulator.scenario_engine.builder import ScenarioBuilder
from simulator.scenario_engine.parser import ScenarioParser
from simulator.simulation_engine.runner import SimulationRunner
from simulator.simulation_engine.timeline import TimelineEngine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/simulation", tags=["simulation"])

_store: Dict[str, Simulation] = {}
_scenario_store: Dict[str, Scenario] = {}
_runner = SimulationRunner()
_timeline_engine = TimelineEngine()
_parser = ScenarioParser()
_builder = ScenarioBuilder()
_reporter = ReportGenerator()
_confidence = ConfidenceAnalyzer()
_counterfactual = CounterfactualEngine()
_portfolio = PortfolioImpactEngine()
_reasoning = ReasoningGraph()


@router.get("/health")
def health():
    return {
        "service": "MarketAtlas Scenario Simulator",
        "status": "ok",
        "version": "0.1.0",
        "active_simulations": len(_store),
        "active_scenarios": len(_scenario_store),
    }


@router.post("/parse")
def parse_scenario(body: Dict[str, str]):
    text = body.get("text", "")
    if not text:
        raise HTTPException(400, "text is required")
    try:
        scenario = _parser.parse_natural_language(text)
        _scenario_store[scenario.id] = scenario
        return {
            "scenario_id": scenario.id,
            "parsed": scenario.to_dict(),
            "message": "Scenario parsed successfully",
        }
    except Exception as e:
        raise HTTPException(500, f"Parse failed: {str(e)}")


@router.post("/create")
def create_scenario(body: CreateScenarioRequest):
    try:
        events = [
            InjectedEvent(
                event_type=EventType(e.get("type", "default")),
                title=e.get("title", ""),
                description=e.get("description", ""),
                countries=e.get("countries", []),
                severity=e.get("severity", 0.5),
            )
            for e in body.events
        ]
        assumptions = AssumptionGraph()
        for a in body.assumptions:
            assumptions.add_assumption(Assumption(
                id=a.get("id", str(uuid.uuid4())),
                description=a.get("description", ""),
                probability=a.get("probability", 0.5),
                category=a.get("category", "general"),
                depends_on=a.get("depends_on", []),
            ))

        scenario = Scenario(
            id=str(uuid.uuid4()),
            title=body.title,
            description=body.description,
            assumptions=assumptions,
            injected_events=events,
            start_time=datetime.utcnow(),
            duration=__import__("datetime").timedelta(days=body.duration_days),
            expected_uncertainty=body.uncertainty,
            tags=body.tags,
        )
        _scenario_store[scenario.id] = scenario

        sim = Simulation(id=str(uuid.uuid4()), scenario=scenario)
        _store[sim.id] = sim

        return {
            "scenario_id": scenario.id,
            "simulation_id": sim.id,
            "scenario": scenario.to_dict(),
        }
    except Exception as e:
        raise HTTPException(500, f"Creation failed: {str(e)}")


@router.post("/run")
def run_simulation(body: RunSimulationRequest):
    scenario = _scenario_store.get(body.scenario_id)
    if not scenario:
        raise HTTPException(404, f"Scenario {body.scenario_id} not found")

    sim = _store.get(body.scenario_id)
    if not sim:
        sim = Simulation(id=str(uuid.uuid4()), scenario=scenario)
        _store[sim.id] = sim

    try:
        run = _runner.run(
            scenario=scenario,
            horizons=body.horizons,
            monte_carlo_runs=body.monte_carlo_runs,
        )
        sim.add_run(run)

        portfolio_impact = _portfolio.calculate_impact(
            scenario,
            max(body.horizons or [365]),
            portfolio_allocation=body.portfolio_allocation,
            sector_data=body.sector_data,
        )

        return {
            "run_id": run.run_id,
            "simulation_id": sim.id,
            "status": "completed",
            "summary": {
                "total_horizons": len(run.horizon_results),
                "total_paths": run.total_paths,
                "average_confidence": run.average_confidence,
                "outlook": run.chief_report.scenario_outlook,
            },
            "chief_report": run.chief_report.to_dict(),
            "portfolio_impact": portfolio_impact,
        }
    except Exception as e:
        raise HTTPException(500, f"Simulation failed: {str(e)}")


@router.get("/{simulation_id}")
def get_simulation(simulation_id: str):
    sim = _store.get(simulation_id)
    if not sim:
        raise HTTPException(404, f"Simulation {simulation_id} not found")
    return sim.to_dict()


@router.get("/{simulation_id}/timeline")
def get_timeline(simulation_id: str):
    sim = _store.get(simulation_id)
    if not sim:
        raise HTTPException(404, f"Simulation {simulation_id} not found")
    run = sim.latest_run()
    if not run:
        raise HTTPException(400, "No runs yet")

    timeline = _timeline_engine.build_timeline(
        sim.scenario,
        {h: r.to_dict() for h, r in run.horizon_results.items()},
    )
    return timeline.to_dict()


@router.get("/{simulation_id}/graph")
def get_simulation_graph(simulation_id: str):
    sim = _store.get(simulation_id)
    if not sim:
        raise HTTPException(404, f"Simulation {simulation_id} not found")
    run = sim.latest_run()
    if not run:
        raise HTTPException(400, "No runs yet")

    graph = _reasoning.build_full_graph(
        sim.scenario,
        run.chief_report.agent_reports,
    )
    return graph


@router.get("/{simulation_id}/agents")
def get_agent_reports(simulation_id: str):
    sim = _store.get(simulation_id)
    if not sim:
        raise HTTPException(404, f"Simulation {simulation_id} not found")
    run = sim.latest_run()
    if not run:
        raise HTTPException(400, "No runs yet")
    return {
        "chief_report": run.chief_report.to_dict(),
        "agent_reports": {
            k.value: v.to_dict() for k, v in run.chief_report.agent_reports.items()
        },
    }


@router.get("/{simulation_id}/report")
def get_report(simulation_id: str):
    sim = _store.get(simulation_id)
    if not sim:
        raise HTTPException(404, f"Simulation {simulation_id} not found")

    report = _reporter.generate(sim)
    return report


@router.get("/{simulation_id}/confidence")
def get_confidence(simulation_id: str):
    sim = _store.get(simulation_id)
    if not sim:
        raise HTTPException(404, f"Simulation {simulation_id} not found")
    run = sim.latest_run()
    if not run:
        raise HTTPException(400, "No runs yet")
    return _confidence.analyze_run(run)


@router.post("/{simulation_id}/counterfactual")
def run_counterfactual(simulation_id: str, body: CounterfactualRequest):
    sim = _store.get(simulation_id)
    if not sim:
        raise HTTPException(404, f"Simulation {simulation_id} not found")
    run = sim.latest_run()
    if not run:
        raise HTTPException(400, "No runs yet")

    result = _counterfactual.run_counterfactual(
        sim.scenario, run, body.modifications,
    )
    return result


@router.post("/{simulation_id}/sensitivity")
def run_sensitivity(simulation_id: str, body: SensitivityRequest):
    sim = _store.get(simulation_id)
    if not sim:
        raise HTTPException(404, f"Simulation {simulation_id} not found")

    results = _counterfactual.sensitivity_analysis(
        sim.scenario, body.target_metric,
    )
    return {"target_metric": body.target_metric, "results": results}


@router.get("/{simulation_id}/portfolio")
def get_portfolio_impact(simulation_id: str, horizon_days: int = Query(90)):
    sim = _store.get(simulation_id)
    if not sim:
        raise HTTPException(404, f"Simulation {simulation_id} not found")

    impact = _portfolio.calculate_impact(sim.scenario, horizon_days)
    return impact


@router.post("/{simulation_id}/portfolio")
def calculate_portfolio_impact(simulation_id: str, body: PortfolioImpactRequest):
    sim = _store.get(simulation_id)
    if not sim:
        raise HTTPException(404, f"Simulation {simulation_id} not found")

    impact = _portfolio.calculate_impact(
        sim.scenario,
        body.horizon_days,
        portfolio_allocation=body.portfolio_allocation,
        sector_data=body.sector_data,
    )
    return impact


@router.get("/{simulation_id}/branches")
def get_scenario_branches(simulation_id: str):
    sim = _store.get(simulation_id)
    if not sim:
        raise HTTPException(404, f"Simulation {simulation_id} not found")

    assumptions = sim.scenario.assumptions
    branches = []
    for aid, assumption in assumptions.assumptions.items():
        branch = {
            "id": aid,
            "description": assumption.description,
            "probability": assumption.probability,
            "is_active": assumption.is_active,
            "alternatives": [
                {"label": "Optimistic", "multiplier": 0.5, "probability": min(1.0, assumption.probability * 1.3)},
                {"label": "Pessimistic", "multiplier": 1.5, "probability": max(0.0, assumption.probability * 0.7)},
            ],
        }
        dependents = assumptions.get_dependents(aid)
        if dependents:
            branch["dependents"] = [d.id for d in dependents]
        branches.append(branch)

    return {"branches": branches, "scenario_id": simulation_id}


@router.get("/")
def list_simulations():
    return {
        "simulations": [s.to_dict() for s in _store.values()],
        "total": len(_store),
    }


@router.delete("/{simulation_id}")
def delete_simulation(simulation_id: str):
    if simulation_id in _store:
        del _store[simulation_id]
    return {"status": "deleted", "simulation_id": simulation_id}

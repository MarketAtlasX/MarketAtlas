from __future__ import annotations

from datetime import datetime, timedelta
from simulator.models.agents import AgentReport, AgentType, ChiefReport, ImpactMetric
from simulator.models.scenario import (
    Assumption,
    AssumptionGraph,
    EventType,
    InjectedEvent,
    Scenario,
)
from simulator.models.simulation import HorizonResult, Simulation, SimulationRun
from simulator.simulation_engine.runner import SimulationRunner


def test_simulation_run():
    scenario = Scenario(
        id="test-sim",
        title="Test Simulation",
        description="Testing simulation engine",
        assumptions=AssumptionGraph(),
        injected_events=[
            InjectedEvent(
                event_type=EventType.MILITARY_CONFLICT,
                title="Conflict",
                description="Test conflict",
                countries=["A", "B"],
                severity=0.7,
            )
        ],
        start_time=datetime.utcnow(),
        duration=timedelta(days=365),
    )

    runner = SimulationRunner()
    run = runner.run(scenario, horizons=[0, 30, 90], monte_carlo_runs=10)

    assert run.run_id is not None
    assert len(run.horizon_results) == 3
    assert run.average_confidence > 0
    assert run.chief_report is not None
    assert run.total_paths > 0


def test_horizon_result():
    result = HorizonResult(
        horizon_days=30,
        timestamp=datetime.utcnow(),
        world_state={},
        risk_scores={"market_risk": 0.45},
        market_impact={"oil_price": 95.0},
        confidence=0.75,
        uncertainty=0.2,
        agent_reports={},
        reasoning_graph={},
    )
    d = result.to_dict()
    assert d["horizon_days"] == 30
    assert d["confidence"] == 0.75


def test_agent_report():
    report = AgentReport(
        agent_type=AgentType.CONFLICT,
        agent_name="Test Agent",
        summary="Test summary",
        impacts=[
            ImpactMetric(
                name="risk_score",
                value=0.6,
                direction="up",
                confidence=0.8,
                reasoning="Test",
            )
        ],
        confidence=0.8,
        key_risks=["Risk 1"],
        key_opportunities=["Opp 1"],
        assumptions_used=["a1"],
        reasoning_graph={},
    )
    d = report.to_dict()
    assert d["agent_type"] == "conflict"
    assert len(d["impacts"]) == 1


def test_chief_report():
    agent_reports = {
        AgentType.CONFLICT: AgentReport(
            agent_type=AgentType.CONFLICT,
            agent_name="Conflict",
            summary="",
            impacts=[],
            confidence=0.7,
            key_risks=[],
            key_opportunities=[],
            assumptions_used=[],
            reasoning_graph={},
        ),
    }
    report = ChiefReport(
        summary="Test",
        overall_confidence=0.7,
        agent_reports=agent_reports,
        consensus_score=0.65,
        key_uncertainties=[],
        scenario_outlook="Cautious",
        recommended_actions=["Monitor"],
        sector_winners=["Defense"],
        sector_losers=["Tech"],
        reasoning_synthesis={},
    )
    d = report.to_dict()
    assert d["overall_confidence"] == 0.7
    assert d["scenario_outlook"] == "Cautious"


def test_simulation_model():
    scenario = Scenario(
        id="s1", title="T", description="D",
        assumptions=AssumptionGraph(),
        injected_events=[],
        start_time=datetime.utcnow(),
        duration=timedelta(days=365),
    )
    sim = Simulation(id="sim-1", scenario=scenario)
    assert sim.status == "draft"
    assert len(sim.runs) == 0

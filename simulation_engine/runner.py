from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from simulator.agents import (
    ChiefIntelligenceAgent,
    ConflictAgent,
    CyberAgent,
    EconomicAgent,
    EnergyAgent,
    MarketAgent,
    PortfolioAgent,
    SupplyChainAgent,
    TradeAgent,
)
from simulator.config import settings
from simulator.models.agents import AgentReport, AgentType, ChiefReport
from simulator.models.scenario import Scenario
from simulator.models.simulation import HorizonResult, Simulation, SimulationRun
from simulator.models.world import SimulationWorld, WorldClone
from simulator.propagation_engine.propagator import RiskPropagator
from simulator.simulation_engine.monte_carlo import MonteCarloEngine
from simulator.world_clone.cloner import WorldCloner

logger = logging.getLogger(__name__)


class SimulationRunner:
    def __init__(self):
        self.cloner = WorldCloner()
        self.propagator = RiskPropagator()
        self.monte_carlo = MonteCarloEngine()
        self.chief = ChiefIntelligenceAgent()
        self._agents = {
            AgentType.CONFLICT: ConflictAgent(),
            AgentType.ECONOMIC: EconomicAgent(),
            AgentType.SUPPLY_CHAIN: SupplyChainAgent(),
            AgentType.ENERGY: EnergyAgent(),
            AgentType.TRADE: TradeAgent(),
            AgentType.CYBER: CyberAgent(),
            AgentType.MARKET: MarketAgent(),
            AgentType.PORTFOLIO: PortfolioAgent(),
        }

    def run(
        self,
        scenario: Scenario,
        horizons: Optional[List[int]] = None,
        monte_carlo_runs: int = 100,
    ) -> SimulationRun:
        run_id = str(uuid.uuid4())
        started_at = datetime.utcnow()
        horizon_days = horizons or settings.default_horizons_days

        world_clone = self.cloner.create_simulation_world()

        horizon_results: Dict[int, HorizonResult] = {}
        all_agent_reports: Dict[str, Dict[str, Any]] = {}

        for h_days in horizon_days:
            logger.info(f"Simulating horizon: {h_days} days")
            result = self._simulate_horizon(scenario, world_clone.get_state(), h_days)
            horizon_results[h_days] = result
            all_agent_reports[str(h_days)] = result.agent_reports

        agent_reports = self._run_agents(scenario, world_clone, max(horizon_days))
        chief_report = self.chief.synthesize(scenario, agent_reports, max(horizon_days))

        mc_results = self.monte_carlo.run(
            scenario=scenario,
            base_state=world_clone.get_state(),
            num_runs=monte_carlo_runs,
            horizons=horizon_days,
        )

        avg_confidence = chief_report.overall_confidence
        if mc_results:
            avg_confidence = (avg_confidence + mc_results.get("average_confidence", 0)) / 2

        run = SimulationRun(
            run_id=run_id,
            scenario_id=scenario.id,
            horizon_results=horizon_results,
            chief_report=chief_report,
            monte_carlo_stats=mc_results,
            started_at=started_at,
            completed_at=datetime.utcnow(),
            total_paths=monte_carlo_runs * len(horizon_days),
            average_confidence=round(avg_confidence, 4),
        )

        self.cloner.destroy_all()

        return run

    def _simulate_horizon(
        self,
        scenario: Scenario,
        world_state: Dict[str, Any],
        horizon_days: int,
    ) -> HorizonResult:
        sim_world = SimulationWorld(
            snapshot_id=f"h_{horizon_days}",
            base_timestamp=scenario.start_time + timedelta(days=horizon_days),
            countries=world_state.get("countries", {}),
            relations=world_state.get("relations", {"trade": [], "military": [], "diplomatic": []}),
            markets=world_state.get("markets", {}),
            global_indicators=world_state.get("global_indicators", {}),
            supply_chains=world_state.get("supply_chains", {}),
            risk_scores=world_state.get("risk_scores", {}),
            knowledge_graph=world_state.get("knowledge_graph", {"nodes": [], "edges": []}),
        )

        agent_reports = self._run_agents(scenario, sim_world, horizon_days)

        risk_scores = {}
        market_impact = {}
        for agent_type, report in agent_reports.items():
            for impact in report.impacts:
                if "risk" in impact.name.lower():
                    risk_scores[impact.name] = impact.value
                else:
                    market_impact[impact.name] = impact.value

        reasoning_graph = self._build_reasoning_graph(scenario, agent_reports, horizon_days)

        confidence_values = [r.confidence for r in agent_reports.values()]
        avg_conf = sum(confidence_values) / max(len(confidence_values), 1)

        uncertainty = scenario.expected_uncertainty * (1 + horizon_days / 365.0)

        return HorizonResult(
            horizon_days=horizon_days,
            timestamp=sim_world.base_timestamp,
            world_state=sim_world.to_dict(),
            risk_scores=risk_scores,
            market_impact=market_impact,
            confidence=round(avg_conf, 4),
            uncertainty=round(min(1.0, uncertainty), 4),
            agent_reports={k.value: v.to_dict() for k, v in agent_reports.items()},
            reasoning_graph=reasoning_graph,
        )

    def _run_agents(
        self,
        scenario: Scenario,
        world: SimulationWorld,
        horizon_days: int,
    ) -> Dict[AgentType, AgentReport]:
        reports: Dict[AgentType, AgentReport] = {}
        for agent_type, agent in self._agents.items():
            try:
                report = agent.analyze(scenario, world, horizon_days)
                reports[agent_type] = report
            except Exception as e:
                logger.error(f"Agent {agent.name} failed: {e}")
        return reports

    def _build_reasoning_graph(
        self,
        scenario: Scenario,
        agent_reports: Dict[AgentType, AgentReport],
        horizon_days: int,
    ) -> Dict[str, Any]:
        graph = {
            "scenario_id": scenario.id,
            "horizon_days": horizon_days,
            "causal_chains": [],
            "assumption_links": [],
        }
        for agent_type, report in agent_reports.items():
            for impact in report.impacts:
                graph["causal_chains"].append({
                    "agent": agent_type.value,
                    "impact": impact.name,
                    "value": impact.value,
                    "reasoning": impact.reasoning,
                    "confidence": impact.confidence,
                })
        for assumption in scenario.assumptions.get_active_assumptions():
            graph["assumption_links"].append({
                "assumption_id": assumption.id,
                "description": assumption.description,
                "probability": assumption.probability,
            })
        return graph

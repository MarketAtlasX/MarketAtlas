from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from simulator.confidence.analyzer import ConfidenceAnalyzer
from simulator.explainability.graph import CausalChainBuilder, ReasoningGraph
from simulator.models.agents import AgentReport, AgentType, ChiefReport
from simulator.models.scenario import Scenario
from simulator.models.simulation import Simulation, SimulationRun
from simulator.portfolio_engine.impact import PortfolioImpactEngine


class ReportGenerator:
    def __init__(self):
        self.confidence = ConfidenceAnalyzer()
        self.explain = CausalChainBuilder()
        self.reasoning = ReasoningGraph()
        self._portfolio_engine = PortfolioImpactEngine()

    def generate(self, simulation: Simulation) -> Dict[str, Any]:
        run = simulation.latest_run()
        if run is None:
            return {"error": "No simulation runs available", "status": simulation.status}

        scenario = simulation.scenario
        chief_report = run.chief_report

        confidence_analysis = self.confidence.analyze_run(run)
        assumption_analysis = self.confidence.analyze_assumptions(scenario.assumptions, run)
        reasoning_graph = self.reasoning.build_full_graph(
            scenario, chief_report.agent_reports
        )

        return {
            "report_id": f"report_{simulation.id}",
            "generated_at": datetime.utcnow().isoformat(),
            "simulation_id": simulation.id,
            "status": simulation.status,

            "scenario_summary": {
                "title": scenario.title,
                "description": scenario.description,
                "start_time": scenario.start_time.isoformat(),
                "duration_days": scenario.duration.days,
                "event_count": len(scenario.injected_events),
                "assumption_count": len(scenario.assumptions.assumptions),
                "tags": scenario.tags,
            },

            "timeline": {
                "horizons": list(run.horizon_results.keys()),
                "horizon_count": len(run.horizon_results),
                "details": {
                    str(h): {
                        "confidence": r.confidence,
                        "uncertainty": r.uncertainty,
                        "risk_scores": r.risk_scores,
                        "market_impact": r.market_impact,
                    }
                    for h, r in run.horizon_results.items()
                },
            },

            "agent_reports": {
                k.value: {
                    "summary": v.summary,
                    "confidence": v.confidence,
                    "impacts": [i.to_dict() for i in v.impacts],
                    "key_risks": v.key_risks,
                    "key_opportunities": v.key_opportunities,
                }
                for k, v in chief_report.agent_reports.items()
            },

            "chief_assessment": {
                "summary": chief_report.summary,
                "overall_confidence": chief_report.overall_confidence,
                "consensus_score": chief_report.consensus_score,
                "scenario_outlook": chief_report.scenario_outlook,
                "recommended_actions": chief_report.recommended_actions,
                "sector_winners": chief_report.sector_winners,
                "sector_losers": chief_report.sector_losers,
                "key_uncertainties": chief_report.key_uncertainties,
            },

            "confidence_analysis": confidence_analysis,
            "assumption_analysis": assumption_analysis,
            "reasoning_graph": reasoning_graph,

            "monte_carlo": run.monte_carlo_stats,

            "portfolio_impact": self._extract_portfolio_impact(run, scenario),

            "historical_analogues": self._find_analogues(scenario),

            "recommended_actions": chief_report.recommended_actions,
        }

    def _extract_portfolio_impact(
        self, run: SimulationRun, scenario: Scenario
    ) -> Dict[str, Any]:
        horizon = max([int(h) for h in run.horizon_results.keys()] or [365])
        engine_impact = self._portfolio_engine.calculate_impact(scenario, horizon)

        portfolio_report = run.chief_report.agent_reports.get(AgentType.PORTFOLIO)
        if portfolio_report:
            agent_impacts = [i.to_dict() for i in portfolio_report.impacts]
            return {
                "summary": engine_impact.get("summary", portfolio_report.summary),
                "impacts": agent_impacts + engine_impact.get("impacts", []),
                "risks": portfolio_report.key_risks,
                "opportunities": portfolio_report.key_opportunities,
                "total_portfolio_impact": engine_impact.get("total_portfolio_impact"),
                "sector_contributions": engine_impact.get("sector_contributions"),
                "estimated_volatility": engine_impact.get("estimated_volatility"),
            }
        return engine_impact

    def _find_analogues(self, scenario: Scenario) -> List[Dict[str, Any]]:
        analogues = [
            {
                "event": "Russia-Ukraine Conflict (2022)",
                "similarity": "high",
                "relevance": "Major military conflict involving major powers, sanctions, energy disruption",
                "market_impact": "Energy +40%, Russia equities -99%, VIX peaked at 36",
            },
            {
                "event": "US-China Trade War (2018-2019)",
                "similarity": "medium",
                "relevance": "Trade restrictions, tech export bans, supply chain reconfiguration",
                "market_impact": "Tech -15%, semis -20%, VIX averaged 18-25",
            },
            {
                "event": "COVID-19 Pandemic (2020)",
                "similarity": "medium",
                "relevance": "Global supply chain disruption, economic contraction, policy response",
                "market_impact": "Global equities -34%, VIX peaked at 82, oil -65%",
            },
            {
                "event": "Gulf War (1990-1991)",
                "similarity": "low",
                "relevance": "Regional conflict, oil disruption, US military intervention",
                "market_impact": "Oil +250%, US equities -17% then recovery",
            },
        ]
        return analogues

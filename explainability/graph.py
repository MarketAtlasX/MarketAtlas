from __future__ import annotations

from typing import Any, Dict, List, Optional

from simulator.models.agents import AgentReport, AgentType, ChiefReport
from simulator.models.scenario import Scenario


class CausalChainBuilder:
    def build(
        self,
        scenario: Scenario,
        agent_reports: Dict[AgentType, AgentReport],
        target_metric: str,
    ) -> Dict[str, Any]:
        chain: List[Dict[str, Any]] = []

        for event in scenario.injected_events:
            chain.append({
                "type": "event",
                "label": event.title,
                "description": event.description,
                "countries": event.countries,
                "severity": event.severity,
            })

        active_assumptions = scenario.assumptions.get_active_assumptions()
        if active_assumptions:
            chain.append({
                "type": "assumptions",
                "label": f"{len(active_assumptions)} assumptions",
                "assumptions": [
                    {"description": a.description, "probability": a.probability}
                    for a in active_assumptions
                ],
            })

        for agent_type, report in agent_reports.items():
            matching = [i for i in report.impacts if target_metric.lower() in i.name.lower()]
            if matching:
                for impact in matching:
                    chain.append({
                        "type": "agent_assessment",
                        "agent": agent_type.value,
                        "impact_name": impact.name,
                        "impact_value": impact.value,
                        "direction": impact.direction,
                        "reasoning": impact.reasoning,
                        "confidence": impact.confidence,
                    })

        return {
            "target_metric": target_metric,
            "causal_chain": chain,
            "chain_length": len(chain),
            "explanation": self._generate_explanation(chain, target_metric),
        }

    def _generate_explanation(
        self,
        chain: List[Dict[str, Any]],
        target: str,
    ) -> str:
        events = [c for c in chain if c["type"] == "event"]
        agents = [c for c in chain if c["type"] == "agent_assessment"]

        if not events and not agents:
            return f"No causal path found for {target}"

        parts = []
        if events:
            parts.append(f"{len(events)} scenario event(s) trigger the chain")
        if agents:
            impacts = ", ".join(
                f"{a['agent']}: {a['impact_name']} {a['direction']} ({a['impact_value']:+.2f})"
                for a in agents[:3]
            )
            parts.append(f"Agent assessments: {impacts}")

        return " -> ".join(parts) if parts else f"Impact on {target}"


class ReasoningGraph:
    def __init__(self):
        self.builder = CausalChainBuilder()

    def build_full_graph(
        self,
        scenario: Scenario,
        agent_reports: Dict[AgentType, AgentReport],
    ) -> Dict[str, Any]:
        all_metrics = set()
        for report in agent_reports.values():
            for impact in report.impacts:
                all_metrics.add(impact.name)

        causal_chains = {}
        for metric in all_metrics:
            causal_chains[metric] = self.builder.build(
                scenario, agent_reports, metric
            )

        return {
            "scenario_id": scenario.id,
            "scenario_title": scenario.title,
            "total_causal_chains": len(causal_chains),
            "chains": causal_chains,
            "graph": self._to_graph_structure(causal_chains),
        }

    def _to_graph_structure(
        self,
        chains: Dict[str, Dict[str, Any]],
    ) -> Dict[str, Any]:
        nodes = []
        edges = []
        node_ids = set()

        for metric, chain_data in chains.items():
            if metric not in node_ids:
                nodes.append({"id": metric, "type": "metric", "label": metric})
                node_ids.add(metric)

            for link in chain_data.get("causal_chain", []):
                link_id = link.get("label", link.get("agent", str(id(link))))
                if link_id not in node_ids:
                    nodes.append({
                        "id": link_id,
                        "type": link["type"],
                        "label": link_id,
                    })
                    node_ids.add(link_id)
                edges.append({
                    "source": link_id,
                    "target": metric,
                    "label": link.get("direction", "influences"),
                })

        return {"nodes": nodes, "edges": edges}

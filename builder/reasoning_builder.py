from __future__ import annotations

from typing import Dict, List, Optional

from graph_engine.models.graph_models import (
    AgentOpinion,
    EdgeType,
    GraphData,
    GraphEdge,
    GraphNode,
    NodeType,
    ReasoningGraph,
)


class ReasoningGraphBuilder:
    AGENTS = [
        "News Agent",
        "Conflict Agent",
        "Energy Agent",
        "Economic Agent",
        "Supply Chain Agent",
        "Market Agent",
        "Risk Agent",
        "Forecast Agent",
        "Geo-Political Agent",
        "Sentiment Agent",
    ]

    def build(
        self,
        target: str,
        agent_opinions: Optional[List[AgentOpinion]] = None,
    ) -> ReasoningGraph:
        if agent_opinions is None:
            agent_opinions = self._generate_sample_opinions(target)

        nodes: Dict[str, GraphNode] = {}
        edges: List[GraphEdge] = []

        target_node_id = f"forecast_{target}"
        nodes[target_node_id] = GraphNode(
            id=target_node_id,
            label=f"Forecast: {target}",
            type=NodeType.forecast,
            metadata={"target": target},
        )

        for opinion in agent_opinions:
            agent_id = f"agent_{opinion.agent_name.replace(' ', '_').lower()}"
            nodes[agent_id] = GraphNode(
                id=agent_id,
                label=opinion.agent_name,
                type=NodeType.agent,
                confidence=opinion.confidence,
                value=opinion.confidence,
                metadata={
                    "sentiment": opinion.sentiment,
                    "reasoning": opinion.reasoning,
                    "supports": opinion.supports,
                    "contradicts": opinion.contradicts,
                },
            )

            edge_type = EdgeType.supports if opinion.sentiment == "bullish" else EdgeType.contradicts
            edges.append(
                GraphEdge(
                    source=agent_id,
                    target=target_node_id,
                    label=f"{opinion.sentiment} ({opinion.confidence:.0%})",
                    type=edge_type,
                    weight=opinion.confidence,
                    confidence=opinion.confidence,
                )
            )

        contributes_map: Dict[str, List[str]] = {}
        for opinion in agent_opinions:
            for supported in opinion.supports:
                if supported not in contributes_map:
                    contributes_map[supported] = []
                contributes_map[supported].append(opinion.agent_name)

        for opinion in agent_opinions:
            agent_id = f"agent_{opinion.agent_name.replace(' ', '_').lower()}"
            for contradicted in opinion.contradicts:
                other_id = f"agent_{contradicted.replace(' ', '_').lower()}"
                if other_id in nodes:
                    edges.append(
                        GraphEdge(
                            source=agent_id,
                            target=other_id,
                            label="disagrees",
                            type=EdgeType.contradicts,
                            weight=0.5,
                        )
                    )

        consensus = self._compute_consensus(agent_opinions)

        return ReasoningGraph(
            target=target,
            agents=agent_opinions,
            graph=GraphData(nodes=list(nodes.values()), edges=edges),
            consensus=consensus["verdict"],
            consensus_confidence=consensus["confidence"],
        )

    def get_agent_by_name(self, agents: List[AgentOpinion], name: str) -> Optional[AgentOpinion]:
        for a in agents:
            if a.agent_name == name:
                return a
        return None

    def get_split_analysis(self, opinions: List[AgentOpinion]) -> Dict:
        bullish = [o for o in opinions if o.sentiment == "bullish"]
        bearish = [o for o in opinions if o.sentiment == "bearish"]
        neutral = [o for o in opinions if o.sentiment == "neutral"]
        return {
            "bullish_count": len(bullish),
            "bearish_count": len(bearish),
            "neutral_count": len(neutral),
            "bullish_avg_conf": round(sum(o.confidence for o in bullish) / max(len(bullish), 1), 3),
            "bearish_avg_conf": round(sum(o.confidence for o in bearish) / max(len(bearish), 1), 3),
        }

    def _compute_consensus(self, opinions: List[AgentOpinion]) -> Dict:
        bullish = sum(o.confidence for o in opinions if o.sentiment == "bullish")
        bearish = sum(o.confidence for o in opinions if o.sentiment == "bearish")
        total = bullish + bearish
        if total == 0:
            return {"verdict": "neutral", "confidence": 0.0}
        if bullish > bearish:
            return {"verdict": "BUY", "confidence": round(bullish / total, 3)}
        else:
            return {"verdict": "SELL", "confidence": round(bearish / total, 3)}

    def _generate_sample_opinions(self, target: str) -> List[AgentOpinion]:
        import random

        opinions = []
        sentiments = ["bullish", "bearish", "neutral"]
        weights = [0.5, 0.3, 0.2]

        for agent in self.AGENTS:
            sentiment = random.choices(sentiments, weights=weights, k=1)[0]
            confidence = round(random.uniform(0.6, 0.95), 2)
            supports = []
            contradicts = []
            remaining = [a for a in self.AGENTS if a != agent]
            for _ in range(random.randint(0, 2)):
                other = random.choice(remaining)
                if sentiment == "bullish":
                    supports.append(other)
                else:
                    contradicts.append(other)

            opinions.append(
                AgentOpinion(
                    agent_name=agent,
                    confidence=confidence,
                    sentiment=sentiment,
                    reasoning=f"{agent} analysis for {target}: {sentiment} with {confidence:.0%} confidence",
                    supports=supports,
                    contradicts=contradicts,
                )
            )

        return opinions

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

from graph_engine.models.graph_models import (
    CausalGraph,
    CausalPath,
    EdgeType,
    GraphData,
    GraphEdge,
    GraphNode,
    NodeType,
)


CAUSAL_KNOWLEDGE_BASE: Dict[str, List[Tuple[str, str, str, float]]] = {
    "Iran Conflict": [
        ("Iran Conflict", "Oil Price", "disrupts supply", 0.85),
        ("Iran Conflict", "Strait of Hormuz", "threatens chokepoint", 0.90),
        ("Iran Conflict", "Middle East Instability", "escalates", 0.75),
        ("Iran Conflict", "Defense Spending", "increases", 0.60),
    ],
    "Oil Price": [
        ("Oil Price", "Inflation", "drives up", 0.70),
        ("Oil Price", "Energy Sector", "impacts revenue", 0.80),
        ("Oil Price", "Transportation", "increases cost", 0.75),
        ("Oil Price", "Oil Producers Revenue", "increases", 0.85),
    ],
    "Inflation": [
        ("Inflation", "Interest Rates", "forces up", 0.80),
        ("Inflation", "Consumer Spending", "reduces", 0.65),
        ("Inflation", "Central Bank Policy", "tightens", 0.75),
        ("Inflation", "Bond Yields", "increases", 0.70),
    ],
    "Interest Rates": [
        ("Interest Rates", "Technology Valuation", "reduces", 0.75),
        ("Interest Rates", "Bond Yields", "increases", 0.85),
        ("Interest Rates", "Housing Market", "slows", 0.60),
        ("Interest Rates", "USD Strength", "strengthens", 0.65),
    ],
    "Technology Valuation": [
        ("Technology Valuation", "NVIDIA", "drives", 0.80),
        ("Technology Valuation", "Tech Sector", "drives", 0.85),
        ("Technology Valuation", "Growth Stocks", "drives", 0.80),
    ],
    "USD Strength": [
        ("USD Strength", "Emerging Markets", "negatively impacts debts", 0.70),
        ("USD Strength", "Commodity Prices", "pushes down", 0.65),
        ("USD Strength", "US Tech Exports", "hurts competitiveness", 0.50),
    ],
    "China": [
        ("China", "Foxconn", "operates", 0.90),
        ("China", "Semiconductors", "demands", 0.80),
        ("China", "Rare Earth Minerals", "supplies", 0.85),
        ("China", "Taiwan Stability", "threatens", 0.70),
    ],
    "Foxconn": [
        ("Foxconn", "iPhone Production", "manufactures", 0.90),
        ("Foxconn", "Apple Supply Chain", "is critical for", 0.85),
        ("Foxconn", "China Manufacturing", "contributes to", 0.75),
    ],
    "Apple Supply Chain": [
        ("Apple Supply Chain", "Apple", "determines", 0.85),
        ("Apple Supply Chain", "Technology Sector", "impacts", 0.70),
    ],
    "Taiwan Stability": [
        ("Taiwan Stability", "TSMC Production", "threatens", 0.85),
        ("Taiwan Stability", "Semiconductors", "disrupts", 0.80),
        ("Taiwan Stability", "Tech Sector", "impacts", 0.75),
    ],
    "Semiconductors": [
        ("Semiconductors", "Tech Sector", "enables", 0.90),
        ("Semiconductors", "NVIDIA", "is essential for", 0.85),
        ("Semiconductors", "TSMC", "produced by", 0.90),
        ("Semiconductors", "Automotive", "impacts", 0.65),
    ],
    "Supply Chain Disruption": [
        ("Supply Chain Disruption", "Apple", "impacts", 0.75),
        ("Supply Chain Disruption", "NVIDIA", "impacts", 0.70),
        ("Supply Chain Disruption", "Inflation", "contributes to", 0.60),
        ("Supply Chain Disruption", "Global Trade", "reduces", 0.65),
    ],
    "Global Trade": [
        ("Global Trade", "Shipping Costs", "increases", 0.70),
        ("Global Trade", "Inflation", "contributes to", 0.55),
        ("Global Trade", "Economic Growth", "slows", 0.65),
    ],
    "Sanctions": [
        ("Sanctions", "Oil Price", "drives up", 0.70),
        ("Sanctions", "Global Trade", "disrupts", 0.65),
        ("Sanctions", "Energy Sector", "restructures", 0.60),
    ],
    "Natural Disaster": [
        ("Natural Disaster", "Supply Chain Disruption", "causes", 0.75),
        ("Natural Disaster", "Insurance Costs", "increases", 0.70),
        ("Natural Disaster", "Commodity Prices", "spikes", 0.65),
    ],
}

NODE_TYPE_MAP: Dict[str, NodeType] = {
    "Iran Conflict": NodeType.event,
    "Oil Price": NodeType.commodity,
    "Inflation": NodeType.concept,
    "Interest Rates": NodeType.concept,
    "Technology Valuation": NodeType.concept,
    "USD Strength": NodeType.concept,
    "China": NodeType.country,
    "Foxconn": NodeType.company,
    "Apple Supply Chain": NodeType.concept,
    "Apple": NodeType.company,
    "NVIDIA": NodeType.company,
    "TSMC": NodeType.company,
    "Taiwan Stability": NodeType.event,
    "Semiconductors": NodeType.commodity,
    "Supply Chain Disruption": NodeType.event,
    "Global Trade": NodeType.concept,
    "Shipping Costs": NodeType.concept,
    "Sanctions": NodeType.event,
    "Natural Disaster": NodeType.event,
    "Energy Sector": NodeType.sector,
    "Tech Sector": NodeType.sector,
    "Defense Spending": NodeType.concept,
    "Middle East Instability": NodeType.event,
    "Rare Earth Minerals": NodeType.commodity,
    "iPhone Production": NodeType.concept,
    "Consumer Spending": NodeType.concept,
    "Central Bank Policy": NodeType.concept,
    "Bond Yields": NodeType.concept,
    "Housing Market": NodeType.concept,
    "Emerging Markets": NodeType.concept,
    "Commodity Prices": NodeType.commodity,
    "US Tech Exports": NodeType.concept,
    "Strait of Hormuz": NodeType.concept,
    "Transportation": NodeType.sector,
    "Oil Producers Revenue": NodeType.concept,
    "Economic Growth": NodeType.concept,
    "Automotive": NodeType.sector,
    "China Manufacturing": NodeType.concept,
    "Tech Sector": NodeType.sector,
    "Energy Sector": NodeType.sector,
}


class CausalGraphBuilder:
    def __init__(self):
        self.knowledge_base = CAUSAL_KNOWLEDGE_BASE

    def find_paths(
        self,
        source: str,
        target: str,
        max_depth: int = 6,
        min_strength: float = 0.1,
    ) -> List[CausalPath]:
        all_paths: List[CausalPath] = []
        visited: set = set()

        def dfs(current: str, path_nodes: List[str], path_edges: List[Tuple], depth: int):
            if depth > max_depth:
                return
            if current == target and path_edges:
                graph_nodes: List[GraphNode] = []
                graph_edges: List[GraphEdge] = []
                total_strength = 1.0
                seen_ids = set()

                for i, node_name in enumerate(path_nodes):
                    if node_name not in seen_ids:
                        graph_nodes.append(self._make_node(node_name))
                        seen_ids.add(node_name)

                for i, (src, tgt, rel, strength) in enumerate(path_edges):
                    graph_edges.append(self._make_edge(src, tgt, rel, strength))
                    total_strength *= strength

                all_paths.append(
                    CausalPath(
                        nodes=graph_nodes,
                        edges=graph_edges,
                        strength=round(total_strength, 3),
                        description=f"{source} -> {target} via {' -> '.join(path_nodes[1:-1])}" if len(path_nodes) > 2 else f"{source} directly impacts {target}",
                    )
                )
                return

            if current in visited:
                return
            visited.add(current)

            connections = self.knowledge_base.get(current, [])
            for src, tgt, rel, strength in connections:
                if strength < min_strength:
                    continue
                if tgt not in visited:
                    path_nodes.append(tgt)
                    path_edges.append((src, tgt, rel, strength))
                    dfs(tgt, path_nodes, path_edges, depth + 1)
                    path_nodes.pop()
                    path_edges.pop()

            visited.remove(current)

        dfs(source, [source], [], 0)
        all_paths.sort(key=lambda p: p.strength, reverse=True)
        return all_paths

    def build_causal_graph(
        self,
        root_event: str,
        target_asset: str,
        max_paths: int = 5,
    ) -> CausalGraph:
        paths = self.find_paths(root_event, target_asset)
        paths = paths[:max_paths]

        all_nodes: Dict[str, GraphNode] = {}
        all_edges: List[GraphEdge] = []
        seen_edges = set()

        for path in paths:
            for node in path.nodes:
                if node.id not in all_nodes:
                    all_nodes[node.id] = node
            for edge in path.edges:
                edge_key = f"{edge.source}->{edge.target}"
                if edge_key not in seen_edges:
                    all_edges.append(edge)
                    seen_edges.add(edge_key)

        ranked_indices = sorted(
            range(len(paths)),
            key=lambda i: paths[i].strength,
            reverse=True,
        )

        return CausalGraph(
            root_event=root_event,
            target_asset=target_asset,
            paths=paths,
            ranked_paths=ranked_indices,
            combined_graph=GraphData(
                nodes=list(all_nodes.values()),
                edges=all_edges,
            ),
        )

    def _make_node(self, name: str) -> GraphNode:
        node_type = NODE_TYPE_MAP.get(name, NodeType.concept)
        return GraphNode(
            id=name,
            label=name,
            type=node_type,
            metadata={"source": "knowledge_base"},
        )

    def _make_edge(self, src: str, tgt: str, rel: str, strength: float) -> GraphEdge:
        return GraphEdge(
            source=src,
            target=tgt,
            label=rel,
            type=EdgeType.affects,
            weight=strength,
            confidence=strength,
        )

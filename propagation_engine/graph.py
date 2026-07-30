from __future__ import annotations

from collections import deque
from typing import Any, Dict, List, Optional, Tuple

from simulator.models.propagation import InfluenceEdge, PropagationPath


class KnowledgeGraphTraverser:
    def __init__(self, max_depth: int = 10, decay: float = 0.85):
        self.max_depth = max_depth
        self.decay = decay
        self._graph: Dict[str, List[InfluenceEdge]] = {}

    def load_graph(self, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> None:
        self._graph.clear()
        node_ids = {n.get("id", n.get("name", "")) for n in nodes}
        for edge_data in edges:
            src = edge_data.get("source", "")
            tgt = edge_data.get("target", "")
            if src not in node_ids or tgt not in node_ids:
                continue
            edge = InfluenceEdge(
                source=src,
                target=tgt,
                weight=edge_data.get("weight", 0.5),
                relationship_type=edge_data.get("type", "unknown"),
                lag_days=edge_data.get("lag_days", 0),
                decay_factor=edge_data.get("decay", self.decay),
            )
            if src not in self._graph:
                self._graph[src] = []
            self._graph[src].append(edge)

    def add_edge(self, edge: InfluenceEdge) -> None:
        if edge.source not in self._graph:
            self._graph[edge.source] = []
        self._graph[edge.source].append(edge)

    def find_paths(
        self,
        source: str,
        target: str,
        max_depth: Optional[int] = None,
    ) -> List[PropagationPath]:
        depth_limit = max_depth or self.max_depth
        paths: List[PropagationPath] = []
        visited = set()

        queue: deque[Tuple[str, List[str], List[InfluenceEdge], float, int]] = deque()
        queue.append((source, [source], [], 1.0, 0))

        while queue:
            current, nodes, edges, weight, lag = queue.popleft()
            if current == target and len(nodes) > 1:
                paths.append(PropagationPath(
                    nodes=nodes,
                    edges=edges,
                    total_weight=weight,
                    total_lag=lag,
                    confidence=weight * (0.9 ** (len(nodes) - 1)),
                ))
                continue

            if len(nodes) >= depth_limit:
                continue

            for edge in self._graph.get(current, []):
                if edge.target in visited and edge.target != target:
                    continue
                visited.add(edge.target)
                queue.append((
                    edge.target,
                    nodes + [edge.target],
                    edges + [edge],
                    weight * edge.weight * edge.decay_factor,
                    lag + edge.lag_days,
                ))

        paths.sort(key=lambda p: p.total_weight, reverse=True)
        return paths

    def propagate_from(
        self,
        source: str,
        initial_impact: float,
        max_depth: Optional[int] = None,
    ) -> Dict[str, float]:
        depth_limit = max_depth or self.max_depth
        impacts: Dict[str, float] = {source: initial_impact}
        queue: deque[Tuple[str, float, int]] = deque()
        queue.append((source, initial_impact, 0))

        while queue:
            current, impact, depth = queue.popleft()
            if depth >= depth_limit:
                continue
            for edge in self._graph.get(current, []):
                propagated = impact * edge.weight * edge.decay_factor
                if edge.target not in impacts or abs(propagated) > abs(impacts[edge.target]):
                    impacts[edge.target] = propagated
                    queue.append((edge.target, propagated, depth + 1))

        return impacts

    def get_downstream(self, node: str) -> List[str]:
        downstream = set()
        queue = deque([node])
        while queue:
            current = queue.popleft()
            for edge in self._graph.get(current, []):
                if edge.target not in downstream:
                    downstream.add(edge.target)
                    queue.append(edge.target)
        return list(downstream)

    def get_upstream(self, node: str) -> List[str]:
        upstream = set()
        for src, edges in self._graph.items():
            for edge in edges:
                if edge.target == node and src not in upstream:
                    upstream.add(src)
        return list(upstream)

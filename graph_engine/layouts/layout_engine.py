from __future__ import annotations

import math
from typing import Any, Dict, List, Tuple

from graph_engine.models.graph_models import GraphData, GraphNode, NodeType


class LayoutEngine:
    def apply_layout(self, graph: GraphData, layout_type: str = "hierarchical") -> GraphData:
        if layout_type == "hierarchical":
            return self._hierarchical_layout(graph)
        elif layout_type == "radial":
            return self._radial_layout(graph)
        elif layout_type == "force":
            return self._force_layout(graph)
        elif layout_type == "tree":
            return self._tree_layout(graph)
        return graph

    def _hierarchical_layout(self, graph: GraphData) -> GraphData:
        levels = self._assign_levels(graph)
        spacing_x = 200
        spacing_y = 120
        level_widths: Dict[int, int] = {}
        for node_id, level in levels.items():
            level_widths[level] = level_widths.get(level, 0) + 1

        level_positions: Dict[int, float] = {}
        level_counts: Dict[int, int] = {}
        for node in graph.nodes:
            level = levels.get(node.id, 0)
            count = level_counts.get(level, 0)
            width = level_widths.get(level, 1)
            x = (count - (width - 1) / 2) * spacing_x
            y = level * spacing_y
            node.metadata["x"] = x
            node.metadata["y"] = y
            level_counts[level] = count + 1

        return graph

    def _radial_layout(self, graph: GraphData) -> GraphData:
        levels = self._assign_levels(graph)
        max_level = max(levels.values()) if levels else 1
        level_counts: Dict[int, int] = {}
        level_positions: Dict[int, int] = {}

        for node in graph.nodes:
            level = levels.get(node.id, 0)
            count = level_positions.get(level, 0)
            total = level_counts.get(level, 0)
            angle = (count / max(total, 1)) * 2 * math.pi
            radius = (level + 1) * 120
            node.metadata["x"] = radius * math.cos(angle)
            node.metadata["y"] = radius * math.sin(angle)
            level_positions[level] = count + 1

        return graph

    def _force_layout(self, graph: GraphData) -> GraphData:
        import random

        positions: Dict[str, Tuple[float, float]] = {}
        for node in graph.nodes:
            positions[node.id] = (random.uniform(-400, 400), random.uniform(-400, 400))

        edge_list = [(e.source, e.target) for e in graph.edges]
        repulsion = 5000
        attraction = 0.01
        iterations = 50

        for _ in range(iterations):
            forces: Dict[str, Tuple[float, float]] = {}

            for nid in positions:
                fx, fy = 0.0, 0.0
                for other in positions:
                    if other == nid:
                        continue
                    dx = positions[nid][0] - positions[other][0]
                    dy = positions[nid][1] - positions[other][1]
                    dist = math.sqrt(dx * dx + dy * dy) + 0.1
                    force = repulsion / (dist * dist)
                    fx += force * dx / dist
                    fy += force * dy / dist
                forces[nid] = (fx, fy)

            for src, tgt in edge_list:
                if src in positions and tgt in positions:
                    dx = positions[tgt][0] - positions[src][0]
                    dy = positions[tgt][1] - positions[src][1]
                    dist = math.sqrt(dx * dx + dy * dy) + 0.1
                    force = attraction * dist
                    if src in forces:
                        fx, fy = forces[src]
                        forces[src] = (fx + force * dx / dist, fy + force * dy / dist)
                    if tgt in forces:
                        fx, fy = forces[tgt]
                        forces[tgt] = (fx - force * dx / dist, fy - force * dy / dist)

            for nid in positions:
                x, y = positions[nid]
                fx, fy = forces.get(nid, (0, 0))
                positions[nid] = (x + fx, y + fy)

        for node in graph.nodes:
            if node.id in positions:
                node.metadata["x"] = positions[node.id][0]
                node.metadata["y"] = positions[node.id][1]

        return graph

    def _tree_layout(self, graph: GraphData) -> GraphData:
        adjacency: Dict[str, List[str]] = {}
        for edge in graph.edges:
            if edge.source not in adjacency:
                adjacency[edge.source] = []
            adjacency[edge.source].append(edge.target)

        roots = [n.id for n in graph.nodes if n.id not in {e.target for e in graph.edges}]
        if not roots:
            roots = [graph.nodes[0].id] if graph.nodes else []

        positions: Dict[str, Tuple[float, float]] = {}
        spacing_x = 180
        spacing_y = 120

        def place(node_id: str, x: float, y: float):
            positions[node_id] = (x, y)
            children = adjacency.get(node_id, [])
            child_width = spacing_x * (len(children) - 1) / 2
            for i, child in enumerate(children):
                cx = x - child_width + i * spacing_x
                place(child, cx, y + spacing_y)

        for i, root in enumerate(roots):
            place(root, i * spacing_x * 2, 0)

        for node in graph.nodes:
            if node.id in positions:
                node.metadata["x"] = positions[node.id][0]
                node.metadata["y"] = positions[node.id][1]

        return graph

    def _assign_levels(self, graph: GraphData) -> Dict[str, int]:
        in_degree: Dict[str, int] = {n.id: 0 for n in graph.nodes}
        adjacency: Dict[str, List[str]] = {n.id: [] for n in graph.nodes}

        for edge in graph.edges:
            if edge.source in adjacency:
                adjacency[edge.source].append(edge.target)
            in_degree[edge.target] = in_degree.get(edge.target, 0) + 1

        levels: Dict[str, int] = {}
        queue = [nid for nid, deg in in_degree.items() if deg == 0]

        for node_id in queue:
            levels[node_id] = 0

        while queue:
            current = queue.pop(0)
            for neighbor in adjacency.get(current, []):
                new_level = levels[current] + 1
                if neighbor not in levels or new_level > levels[neighbor]:
                    levels[neighbor] = new_level
                in_degree[neighbor] -= 1
                if in_degree[neighbor] <= 0:
                    queue.append(neighbor)

        for node in graph.nodes:
            if node.id not in levels:
                levels[node.id] = 0

        return levels

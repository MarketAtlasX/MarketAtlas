from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from simulator.models.propagation import InfluenceEdge, RiskDelta
from simulator.propagation_engine.graph import KnowledgeGraphTraverser

logger = logging.getLogger(__name__)


class RiskPropagator:
    def __init__(self, max_depth: int = 10, decay: float = 0.85):
        self.traverser = KnowledgeGraphTraverser(max_depth=max_depth, decay=decay)

    def build_default_graph(self) -> None:
        default_nodes = [
            {"id": "Taiwan", "type": "country"},
            {"id": "China", "type": "country"},
            {"id": "USA", "type": "country"},
            {"id": "TSMC", "type": "company"},
            {"id": "Semiconductors", "type": "sector"},
            {"id": "NVIDIA", "type": "company"},
            {"id": "NASDAQ", "type": "market"},
            {"id": "Oil", "type": "commodity"},
            {"id": "StraitOfHormuz", "type": "chokepoint"},
            {"id": "RareEarths", "type": "commodity"},
            {"id": "Europe", "type": "region"},
            {"id": "SoutheastAsia", "type": "region"},
        ]
        default_edges = [
            {"source": "Taiwan", "target": "TSMC", "weight": 0.9, "type": "produces", "lag_days": 0},
            {"source": "TSMC", "target": "Semiconductors", "weight": 0.95, "type": "supplies", "lag_days": 7},
            {"source": "Semiconductors", "target": "NVIDIA", "weight": 0.8, "type": "supplies", "lag_days": 14},
            {"source": "Semiconductors", "target": "NASDAQ", "weight": 0.7, "type": "impacts", "lag_days": 30},
            {"source": "NVIDIA", "target": "NASDAQ", "weight": 0.6, "type": "listed_on", "lag_days": 0},
            {"source": "China", "target": "Taiwan", "weight": 0.95, "type": "claims", "lag_days": 0},
            {"source": "China", "target": "RareEarths", "weight": 0.8, "type": "controls", "lag_days": 7},
            {"source": "USA", "target": "China", "weight": 0.7, "type": "sanctions", "lag_days": 30},
            {"source": "USA", "target": "Taiwan", "weight": 0.6, "type": "protects", "lag_days": 0},
            {"source": "StraitOfHormuz", "target": "Oil", "weight": 0.9, "type": "affects", "lag_days": 2},
            {"source": "Oil", "target": "NASDAQ", "weight": 0.5, "type": "impacts", "lag_days": 45},
            {"source": "Taiwan", "target": "SoutheastAsia", "weight": 0.7, "type": "trade_partner", "lag_days": 14},
            {"source": "Semiconductors", "target": "Europe", "weight": 0.6, "type": "exports_to", "lag_days": 21},
        ]
        self.traverser.load_graph(default_nodes, default_edges)

    def propagate(
        self,
        source: str,
        impact: float,
        world_state: Dict[str, Any],
    ) -> List[RiskDelta]:
        if not self.traverser._graph:
            self.build_default_graph()

        impacts = self.traverser.propagate_from(source, impact)
        deltas: List[RiskDelta] = []

        for target, value in impacts.items():
            if target == source:
                continue
            paths = self.traverser.find_paths(source, target)
            propagation_path = paths[0].nodes if paths else [source, target]
            confidence = (paths[0].confidence if paths else 0.5) * (1 - 0.1 * (len(propagation_path) - 1))
            deltas.append(RiskDelta(
                entity_id=target,
                delta_value=round(value, 4),
                source=source,
                propagation_path=propagation_path,
                confidence=round(max(0.0, min(1.0, confidence)), 4),
            ))

        deltas.sort(key=lambda d: abs(d.delta_value), reverse=True)
        return deltas

    def propagate_chain(
        self,
        chain: List[str],
        initial_impact: float,
        world_state: Dict[str, Any],
    ) -> List[RiskDelta]:
        deltas = []
        current_impact = initial_impact
        for i in range(len(chain) - 1):
            source = chain[i]
            target = chain[i + 1]
            edge = InfluenceEdge(
                source=source,
                target=target,
                weight=0.8,
                relationship_type="chain",
                lag_days=i * 7,
            )
            self.traverser.add_edge(edge)
            propagated = current_impact * edge.weight * edge.decay_factor
            deltas.append(RiskDelta(
                entity_id=target,
                delta_value=round(propagated, 4),
                source=source,
                propagation_path=chain[:i + 2],
                confidence=round(0.9 ** (len(chain) - 1), 4),
            ))
            current_impact = propagated
        return deltas

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional


@dataclass
class WorldStateSnapshot:
    timestamp: datetime
    country_states: Dict[str, Dict[str, Any]]
    global_indicators: Dict[str, float]
    market_data: Dict[str, Dict[str, float]]
    risk_scores: Dict[str, float]
    supply_chain_status: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "country_states": self.country_states,
            "global_indicators": self.global_indicators,
            "market_data": self.market_data,
            "risk_scores": self.risk_scores,
            "supply_chain_status": self.supply_chain_status,
        }


@dataclass
class SimulationWorld:
    snapshot_id: str
    base_timestamp: datetime
    countries: Dict[str, Dict[str, Any]]
    relations: Dict[str, List[Dict[str, Any]]]
    markets: Dict[str, Dict[str, float]]
    global_indicators: Dict[str, float]
    supply_chains: Dict[str, Any]
    risk_scores: Dict[str, float]
    knowledge_graph: Dict[str, Any]

    def apply_delta(self, key: str, value: Any, path: Optional[List[str]] = None) -> None:
        if path:
            target = self
            for p in path[:-1]:
                if p not in target:
                    target[p] = {}
                target = target[p]
            target[path[-1]] = value
        else:
            if hasattr(self, key):
                setattr(self, key, value)

    def clone(self) -> SimulationWorld:
        import copy
        return copy.deepcopy(self)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "snapshot_id": self.snapshot_id,
            "base_timestamp": self.base_timestamp.isoformat(),
            "countries": self.countries,
            "relations": self.relations,
            "markets": self.markets,
            "global_indicators": self.global_indicators,
            "supply_chains": self.supply_chains,
            "risk_scores": self.risk_scores,
            "knowledge_graph": self.knowledge_graph,
        }


class WorldClone:
    def __init__(self, source_state: Dict[str, Any]):
        import copy
        self.original = source_state
        self.world = copy.deepcopy(source_state)
        self.created_at = datetime.utcnow()
        self.is_destroyed = False

    def get_state(self) -> Dict[str, Any]:
        return self.world

    def modify(self, path: str, value: Any) -> None:
        keys = path.split(".")
        target = self.world
        for k in keys[:-1]:
            if k not in target:
                target[k] = {}
            target = target[k]
        target[keys[-1]] = value

    def destroy(self) -> None:
        self.world = None
        self.is_destroyed = True

    def is_alive(self) -> bool:
        return not self.is_destroyed and self.world is not None

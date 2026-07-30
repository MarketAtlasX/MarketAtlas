from __future__ import annotations

import copy
import logging
from datetime import datetime
from typing import Any, Dict, Optional

from simulator.models.world import SimulationWorld, WorldClone

logger = logging.getLogger(__name__)


class WorldCloner:
    def __init__(self):
        self._active_clones: Dict[str, WorldClone] = {}

    def fetch_live_world(self) -> Dict[str, Any]:
        world_state = {
            "snapshot_id": f"snap_{datetime.utcnow().timestamp():.0f}",
            "base_timestamp": datetime.utcnow(),
            "countries": {},
            "relations": {"trade": [], "military": [], "diplomatic": []},
            "markets": {},
            "global_indicators": {
                "gdp_growth": 2.8,
                "inflation": 3.2,
                "unemployment": 4.1,
                "interest_rate": 4.5,
                "oil_price": 82.0,
                "vix": 18.5,
            },
            "supply_chains": {},
            "risk_scores": {},
            "knowledge_graph": {"nodes": [], "edges": []},
        }
        return world_state

    def create_simulation_world(self, source_state: Optional[Dict[str, Any]] = None) -> WorldClone:
        state = source_state or self.fetch_live_world()
        clone = WorldClone(state)
        clone_id = f"world_clone_{datetime.utcnow().timestamp():.0f}"
        self._active_clones[clone_id] = clone
        logger.info(f"Created simulation world clone: {clone_id}")
        return clone

    def destroy_clone(self, clone_id: str) -> bool:
        clone = self._active_clones.pop(clone_id, None)
        if clone:
            clone.destroy()
            logger.info(f"Destroyed simulation world clone: {clone_id}")
            return True
        return False

    def destroy_all(self) -> int:
        count = len(self._active_clones)
        for cid in list(self._active_clones.keys()):
            self.destroy_clone(cid)
        return count

    def get_active_count(self) -> int:
        return len(self._active_clones)

from __future__ import annotations

import copy
import logging
from datetime import datetime
from typing import Any, Dict, Optional

import httpx

from simulator.config import settings
from simulator.models.world import SimulationWorld, WorldClone

logger = logging.getLogger(__name__)

_DEFAULT_COUNTRIES = [
    ("US", "United States"), ("CN", "China"), ("RU", "Russia"),
    ("IN", "India"), ("GB", "United Kingdom"), ("DE", "Germany"),
    ("FR", "France"), ("JP", "Japan"), ("SA", "Saudi Arabia"),
    ("BR", "Brazil"), ("UA", "Ukraine"), ("IR", "Iran"),
]


class WorldCloner:
    def __init__(self):
        self._active_clones: Dict[str, WorldClone] = {}

    def _fetch_json(self, url: str, timeout: float = 3.0) -> Optional[Dict[str, Any]]:
        try:
            with httpx.Client(timeout=timeout) as client:
                resp = client.get(url)
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.warning(f"fetch_live_world: could not reach {url}: {e}")
            return None

    def _fetch_world_state(self) -> Dict[str, Any]:
        """Pull live country risk + global indicators from the world_state service."""
        countries: Dict[str, Dict[str, Any]] = {}
        risk_scores: Dict[str, float] = {}
        global_indicators: Dict[str, float] = {
            "gdp_growth": 2.8,
            "inflation": 3.2,
            "unemployment": 4.1,
            "interest_rate": 4.5,
            "oil_price": 82.0,
            "vix": 18.5,
        }

        data = self._fetch_json(f"{settings.world_state_api_url}/api/world-state/dashboard")
        if not data:
            for cid, name in _DEFAULT_COUNTRIES:
                countries[cid] = {
                    "id": cid,
                    "name": name,
                    "risk_score": 0.5,
                    "risk_level": "medium",
                    "confidence": 0.5,
                }
                risk_scores[cid] = 0.5
            return {"countries": countries, "risk_scores": risk_scores, "global_indicators": global_indicators}

        risk = data.get("global_risk", {})
        global_indicators["geopolitical_risk"] = risk.get("geopolitical", 0.0)
        global_indicators["economic_risk"] = risk.get("economic", 0.0)
        global_indicators["market_risk"] = risk.get("market", 0.0)
        global_indicators["global_risk"] = risk.get("composite", 0.0)

        for row in data.get("countries", []):
            cid = row.get("id")
            if not cid:
                continue
            countries[cid] = {
                "id": cid,
                "name": row.get("name", cid),
                "risk_score": row.get("risk_score", 0.0),
                "risk_level": row.get("risk_level", "low"),
                "geopolitical_risk": row.get("geopolitical_risk", 0.0),
                "economic_risk": row.get("economic_risk", 0.0),
                "military_activity": row.get("military_activity", 0.0),
                "sanctions": row.get("sanctions", 0.0),
                "confidence": row.get("confidence", 0.5),
            }
            risk_scores[cid] = row.get("risk_score", 0.0)

        return {"countries": countries, "risk_scores": risk_scores, "global_indicators": global_indicators}

    def _fetch_graph_engine(self) -> Dict[str, Any]:
        """Pull a live knowledge graph from the graph_engine service."""
        data = self._fetch_json(
            f"{settings.graph_engine_api_url}/api/graph/causal",
            timeout=4.0,
        )
        if not data:
            return {"nodes": [], "edges": []}
        inner = data.get("data", {})
        graph = inner.get("combined_graph") or inner.get("graph") or {}
        nodes = []
        edges = []
        for n in graph.get("nodes", []):
            nodes.append({
                "id": n.get("id"),
                "label": n.get("label", n.get("id")),
                "type": n.get("type", "concept"),
                "confidence": n.get("confidence", 1.0),
            })
        for e in graph.get("edges", []):
            edges.append({
                "source": e.get("source"),
                "target": e.get("target"),
                "label": e.get("label", ""),
                "weight": e.get("weight", 1.0),
            })
        return {"nodes": nodes, "edges": edges}

    def fetch_live_world(self) -> Dict[str, Any]:
        live = self._fetch_world_state()
        graph = self._fetch_graph_engine()
        world_state = {
            "snapshot_id": f"snap_{datetime.utcnow().timestamp():.0f}",
            "base_timestamp": datetime.utcnow(),
            "countries": live["countries"],
            "relations": {"trade": [], "military": [], "diplomatic": []},
            "markets": {},
            "global_indicators": live["global_indicators"],
            "supply_chains": {},
            "risk_scores": live["risk_scores"],
            "knowledge_graph": graph,
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

"""StateRegistry — the central consciousness.

Every agent reads from this. Every event writes to this.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from world_state.core.types import (
    MultiScaleState,
    NodeType,
    Snapshot,
    StateDelta,
    StateVector,
    WorldSnapshot,
)
from world_state.nodes.country import CountryState
from world_state.nodes.region import RegionState
from world_state.nodes.world import WorldState
from world_state.nodes.sector import SectorState
from world_state.nodes.company import CompanyState

logger = logging.getLogger(__name__)


class StateRegistry:
    """One central object. Every agent reads this."""

    _instance: Optional[StateRegistry] = None

    def __new__(cls) -> StateRegistry:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        if self._initialized:
            return
        self._initialized = True

        self.world: WorldState = WorldState()
        self.regions: Dict[str, RegionState] = {}
        self.countries: Dict[str, CountryState] = {}
        self.sectors: Dict[str, SectorState] = {}
        self.companies: Dict[str, CompanyState] = {}
        self.commodities: Dict[str, StateVector] = {}
        self.markets: Dict[str, StateVector] = {}

        self._snapshots: List[Snapshot] = []
        self._world_snapshots: List[WorldSnapshot] = []
        self._event_log: List[StateDelta] = []
        self._version: int = 0

        logger.info("StateRegistry initialized — the world is awake")

    # ── Access ─────────────────────────────────────────────────

    def get_country(self, name: str) -> CountryState:
        key = name.lower().replace(" ", "_")
        if key not in self.countries:
            self.countries[key] = CountryState(name=name)
            logger.debug("Created new country state: %s", name)
        return self.countries[key]

    def get_region(self, name: str) -> RegionState:
        key = name.lower().replace(" ", "_")
        if key not in self.regions:
            self.regions[key] = RegionState(name=name)
            logger.debug("Created new region state: %s", name)
        return self.regions[key]

    def get_sector(self, name: str) -> SectorState:
        key = name.lower().replace(" ", "_")
        if key not in self.sectors:
            self.sectors[key] = SectorState(name=name)
            logger.debug("Created new sector state: %s", name)
        return self.sectors[key]

    def get_company(self, name: str) -> CompanyState:
        key = name.lower().replace(" ", "_")
        if key not in self.companies:
            self.companies[key] = CompanyState(name=name)
            logger.debug("Created new company state: %s", name)
        return self.companies[key]

    def get_commodity(self, name: str) -> StateVector:
        key = name.lower().replace(" ", "_")
        if key not in self.commodities:
            self.commodities[key] = StateVector()
        return self.commodities[key]

    def get_market(self, name: str) -> StateVector:
        key = name.lower().replace(" ", "_")
        if key not in self.markets:
            self.markets[key] = StateVector()
        return self.markets[key]

    # ── State Update ───────────────────────────────────────────

    def apply_delta(self, delta: StateDelta) -> None:
        self._event_log.append(delta)
        self._version += 1

        if delta.node_type == NodeType.COUNTRY:
            state = self.get_country(delta.node_id)
        elif delta.node_type == NodeType.REGION:
            state = self.get_region(delta.node_id)
        elif delta.node_type == NodeType.SECTOR:
            state = self.get_sector(delta.node_id)
        elif delta.node_type == NodeType.COMPANY:
            state = self.get_company(delta.node_id)
        elif delta.node_type == NodeType.WORLD:
            state = self.world
        elif delta.node_type == NodeType.COMMODITY:
            sv = self.get_commodity(delta.node_id)
            for key, val in delta.updates.items():
                sv.update(key, val, delta.confidence)
            return
        elif delta.node_type == NodeType.MARKET:
            sv = self.get_market(delta.node_id)
            for key, val in delta.updates.items():
                sv.update(key, val, delta.confidence)
            return
        else:
            logger.warning("Unknown node type: %s", delta.node_type)
            return

        for key, val in delta.updates.items():
            state.update(key, val, delta.confidence)

        state.last_updated = delta.timestamp
        state.last_event_id = delta.source_event_id
        state.last_event_title = delta.source_event_title

    def get_state_vector(self, node_id: str, node_type: NodeType) -> Optional[StateVector]:
        if node_type == NodeType.COUNTRY:
            state = self.countries.get(node_id)
            return state.to_vector() if state else None
        elif node_type == NodeType.REGION:
            state = self.regions.get(node_id)
            return state.to_vector() if state else None
        elif node_type == NodeType.SECTOR:
            state = self.sectors.get(node_id)
            return state.to_vector() if state else None
        elif node_type == NodeType.COMPANY:
            state = self.companies.get(node_id)
            return state.to_vector() if state else None
        elif node_type == NodeType.WORLD:
            return self.world.to_vector()
        elif node_type == NodeType.COMMODITY:
            return self.commodities.get(node_id)
        elif node_type == NodeType.MARKET:
            return self.markets.get(node_id)
        return None

    def get_multi_scale(self, node_id: str, node_type: NodeType) -> Optional[MultiScaleState]:
        if node_type == NodeType.COUNTRY:
            state = self.countries.get(node_id)
            return state.multi_scale if state else None
        elif node_type == NodeType.REGION:
            state = self.regions.get(node_id)
            return state.multi_scale if state else None
        elif node_type == NodeType.SECTOR:
            state = self.sectors.get(node_id)
            return state.multi_scale if state else None
        elif node_type == NodeType.COMPANY:
            state = self.companies.get(node_id)
            return state.multi_scale if state else None
        return None

    # ── Snapshots ──────────────────────────────────────────────

    def take_snapshot(self, node_id: str, node_type: NodeType) -> Optional[Snapshot]:
        sv = self.get_state_vector(node_id, node_type)
        if sv is None:
            return None

        ms = self.get_multi_scale(node_id, node_type)

        snapshot = Snapshot(
            node_id=node_id,
            node_type=node_type,
            state_vector=sv.model_dump(),
            multi_scale=ms.to_dict() if ms else None,
        )
        self._snapshots.append(snapshot)
        return snapshot

    def take_world_snapshot(self) -> WorldSnapshot:
        ws = WorldSnapshot(
            world_state=self.world.to_vector().model_dump(),
            country_states={
                k: v.to_vector().model_dump() for k, v in self.countries.items()
            },
            region_states={
                k: v.to_vector().model_dump() for k, v in self.regions.items()
            },
            confidence=self.world.to_vector().avg_confidence,
            event_count=self._version,
        )
        self._world_snapshots.append(ws)

        if len(self._world_snapshots) > 10000:
            self._world_snapshots = self._world_snapshots[-5000:]

        return ws

    def get_snapshot_history(
        self, node_id: str, node_type: NodeType, limit: int = 100
    ) -> List[Snapshot]:
        return [
            s for s in self._snapshots
            if s.node_id == node_id and s.node_type == node_type
        ][-limit:]

    def get_world_snapshots(self, limit: int = 100) -> List[WorldSnapshot]:
        return self._world_snapshots[-limit:]

    # ── Summary ────────────────────────────────────────────────

    def summary(self) -> Dict[str, Any]:
        return {
            "version": self._version,
            "countries": len(self.countries),
            "regions": len(self.regions),
            "sectors": len(self.sectors),
            "companies": len(self.companies),
            "commodities": len(self.commodities),
            "markets": len(self.markets),
            "snapshots": len(self._snapshots),
            "world_snapshots": len(self._world_snapshots),
            "events_processed": len(self._event_log),
            "world_avg_confidence": round(self.world.to_vector().avg_confidence, 4),
        }

    @classmethod
    def reset(cls) -> None:
        cls._instance = None
        logger.info("StateRegistry reset")

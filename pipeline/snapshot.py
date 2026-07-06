"""SnapshotManager — store temporal snapshots of the world state.

Every hour: store WorldSnapshot. Now you have a historical sequence.
Perfect for LSTM.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from world_state.core.registry import StateRegistry
from world_state.core.types import Snapshot, WorldSnapshot

logger = logging.getLogger(__name__)


class SnapshotManager:
    """Manages temporal snapshots of the Dynamic World State."""

    def __init__(self, max_snapshots: int = 10000) -> None:
        self.registry = StateRegistry()
        self.max_snapshots = max_snapshots
        self._snapshots: List[WorldSnapshot] = []
        self._last_snapshot_time: Optional[datetime] = None
        self._min_interval_seconds: float = 300

    def take_snapshot(self, force: bool = False) -> Optional[WorldSnapshot]:
        now = datetime.utcnow()

        if not force and self._last_snapshot_time:
            elapsed = (now - self._last_snapshot_time).total_seconds()
            if elapsed < self._min_interval_seconds:
                return None

        snapshot = self.registry.take_world_snapshot()
        self._snapshots.append(snapshot)
        self._last_snapshot_time = now

        if len(self._snapshots) > self.max_snapshots:
            self._snapshots = self._snapshots[-self.max_snapshots:]

        logger.debug("World snapshot taken: %s", snapshot.snapshot_id[:8])
        return snapshot

    def get_snapshots(
        self,
        since: Optional[datetime] = None,
        limit: int = 100,
    ) -> List[WorldSnapshot]:
        if since:
            filtered = [s for s in self._snapshots if s.timestamp >= since]
            return filtered[-limit:]
        return self._snapshots[-limit:]

    def get_snapshot_sequence(
        self,
        window_size: int = 30,
    ) -> List[WorldSnapshot]:
        return self._snapshots[-window_size:]

    def get_state_history(
        self,
        state_key: str,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        history = []
        for snap in self._snapshots[-limit:]:
            if state_key in snap.world_state:
                history.append({
                    "timestamp": snap.timestamp.isoformat(),
                    "value": snap.world_state[state_key].get("value", 0),
                    "confidence": snap.world_state[state_key].get("confidence", 1.0),
                })
        return history

    def get_country_history(
        self,
        country_key: str,
        state_key: str,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        history = []
        for snap in self._snapshots[-limit:]:
            country = snap.country_states.get(country_key)
            if country and state_key in country:
                history.append({
                    "timestamp": snap.timestamp.isoformat(),
                    "value": country[state_key].get("value", 0),
                    "confidence": country[state_key].get("confidence", 1.0),
                })
        return history

    def export_sequence_for_training(
        self,
        window_size: int = 100,
    ) -> List[Dict[str, Any]]:
        sequence = []
        for snap in self._snapshots[-window_size:]:
            sequence.append({
                "timestamp": snap.timestamp.isoformat(),
                "world_state": {
                    k: v.get("value", 0) for k, v in snap.world_state.items()
                },
                "risk_scores": snap.risk_scores,
                "confidence": snap.confidence,
            })
        return sequence

    def clear(self) -> None:
        self._snapshots.clear()
        self._last_snapshot_time = None
        logger.info("SnapshotManager cleared")

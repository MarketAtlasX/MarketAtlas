"""StateUpdatePipeline — the complete event → world state update pipeline.

News Event → Entity Extraction → Knowledge Graph → Feature Extraction
→ Risk Propagation → Country Update → Regional Update → World Update
→ Market Update → Store Snapshot
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from pipelines.core.base import Pipeline, PipelineStage
from pipelines.core.types import Context, Event, Outcome, PipelineStatus

from world_state.core.registry import StateRegistry
from world_state.core.types import NodeType, StateDelta, WorldSnapshot
from world_state.pipeline.extract import EventExtractor
from world_state.pipeline.propagate import RiskPropagator
from world_state.pipeline.snapshot import SnapshotManager

logger = logging.getLogger(__name__)


class StateUpdateStage(PipelineStage):
    def __init__(self) -> None:
        super().__init__("world_state_update")
        self.registry = StateRegistry()
        self.extractor = EventExtractor()
        self.propagator = RiskPropagator()
        self.snapshot_mgr = SnapshotManager()

    async def run(self, event: Event, context: Context) -> Event:
        event_data = event.data
        raw_events = (
            event_data.get("summarized_events")
            or event_data.get("sentiment_events")
            or event_data.get("cleaned_events")
            or event_data.get("embedded_events")
            or [event_data]
        )

        if not isinstance(raw_events, list):
            raw_events = [raw_events]

        total_deltas = 0
        for raw in raw_events:
            if isinstance(raw, dict):
                normalized = self._normalize(raw)
                deltas = self._process_single(normalized)
                total_deltas += len(deltas)

        snapshot = self.snapshot_mgr.take_snapshot()

        event.data["world_state_update"] = {
            "deltas_applied": total_deltas,
            "snapshot_id": snapshot.snapshot_id if snapshot else None,
            "registry_summary": self.registry.summary(),
        }

        logger.info(
            "World state updated: %d deltas, version %d",
            total_deltas,
            self.registry.summary()["version"],
        )

        return event

    def _normalize(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        if "title" in raw or "content" in raw:
            return raw
        if "data" in raw and isinstance(raw["data"], dict):
            data = raw["data"]
            data["source"] = data.get("source") or raw.get("source", "unknown")
            data["id"] = data.get("id") or raw.get("id")
            return data
        return raw

    def _process_single(self, event_data: Dict[str, Any]) -> List[StateDelta]:
        all_deltas: List[StateDelta] = []

        initial_deltas = self.extractor.extract(event_data)
        all_deltas.extend(initial_deltas)

        for delta in initial_deltas:
            self.registry.apply_delta(delta)

            propagated = self.propagator.propagate(delta)
            for p_delta in propagated:
                self.registry.apply_delta(p_delta)
                all_deltas.append(p_delta)

        return all_deltas


class StateUpdatePipeline(Pipeline):
    def __init__(self) -> None:
        super().__init__(
            name="world_state_update",
            stages=[StateUpdateStage()],
        )

    async def run(self, event: Event, context: Context) -> Outcome:
        self.state.start()
        try:
            result = await self.execute(event, context)
            ws_update = result.data.get("world_state_update", {})
            reg_summary = ws_update.get("registry_summary", {})
            outcome = Outcome(
                context=context,
                status=PipelineStatus.SUCCESS,
                events=[result],
                metrics={
                    "deltas": ws_update.get("deltas_applied", 0),
                    "countries": reg_summary.get("countries", 0),
                    "version": reg_summary.get("version", 0),
                },
            )
            self.state.succeed(outcome)
            return outcome
        except Exception as e:
            logger.exception("StateUpdatePipeline failed")
            outcome = Outcome(
                context=context,
                status=PipelineStatus.FAILED,
                error=str(e),
            )
            self.state.fail(outcome)
            return outcome

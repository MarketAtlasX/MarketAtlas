from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from simulator.models.scenario import Scenario
from simulator.models.timeline import SimulationTimeline, TimelineStep


class TimelineEngine:
    def __init__(self):
        self.default_checkpoints = [0, 1, 3, 7, 14, 30, 60, 90, 180, 365]

    def build_timeline(
        self,
        scenario: Scenario,
        horizon_results: Dict[int, Dict[str, Any]],
    ) -> SimulationTimeline:
        checkpoints = [d for d in self.default_checkpoints if d <= scenario.duration.days]
        timeline = SimulationTimeline(
            scenario_id=scenario.id,
            horizons=checkpoints,
        )

        for step_index, days in enumerate(checkpoints):
            ts = scenario.start_time + timedelta(days=days)
            result = horizon_results.get(days, {})

            step = TimelineStep(
                step_index=step_index,
                days_from_start=days,
                timestamp=ts,
                world_state=result.get("world_state", {}),
                risk_deltas=result.get("risk_scores", {}),
                market_deltas=result.get("market_impact", {}),
                agent_assessments=result.get("agent_reports", {}),
                confidence=result.get("confidence", 0.5),
            )
            timeline.add_step(step)

        return timeline

    def interpolate_step(
        self,
        timeline: SimulationTimeline,
        target_days: int,
    ) -> Optional[TimelineStep]:
        steps = timeline.get_all_steps()
        if not steps:
            return None
        if target_days <= steps[0].days_from_start:
            return steps[0]
        if target_days >= steps[-1].days_from_start:
            return steps[-1]

        before = after = None
        for i, step in enumerate(steps):
            if step.days_from_start <= target_days:
                before = step
            if step.days_from_start >= target_days and after is None:
                after = step

        if before is None or after is None:
            return before or after

        ratio = (target_days - before.days_from_start) / max(after.days_from_start - before.days_from_start, 1)

        return TimelineStep(
            step_index=-1,
            days_from_start=target_days,
            timestamp=before.timestamp + timedelta(days=target_days - before.days_from_start),
            world_state=self._interpolate_dict(before.world_state, after.world_state, ratio),
            risk_deltas=self._interpolate_dict(before.risk_deltas, after.risk_deltas, ratio),
            market_deltas=self._interpolate_dict(before.market_deltas, after.market_deltas, ratio),
            agent_assessments=after.agent_assessments,
            confidence=before.confidence + (after.confidence - before.confidence) * ratio,
        )

    def _interpolate_dict(
        self,
        before: Dict[str, Any],
        after: Dict[str, Any],
        ratio: float,
    ) -> Dict[str, Any]:
        result = {}
        all_keys = set(before.keys()) | set(after.keys())
        for key in all_keys:
            b = before.get(key, 0)
            a = after.get(key, 0)
            if isinstance(b, (int, float)) and isinstance(a, (int, float)):
                result[key] = b + (a - b) * ratio
            else:
                result[key] = a if ratio > 0.5 else b
        return result

from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from simulator.models.scenario import (
    Assumption,
    AssumptionGraph,
    EventType,
    InjectedEvent,
    Scenario,
)


class ScenarioBuilder:
    def __init__(self):
        self.reset()

    def reset(self) -> None:
        self._id = str(uuid.uuid4())
        self._title = ""
        self._description = ""
        self._assumptions = AssumptionGraph()
        self._events: List[InjectedEvent] = []
        self._start_time = datetime.utcnow()
        self._duration = timedelta(days=365)
        self._uncertainty = 0.3
        self._tags: List[str] = []
        self._metadata: Dict[str, Any] = {}
        return self

    def with_title(self, title: str) -> ScenarioBuilder:
        self._title = title
        return self

    def with_description(self, description: str) -> ScenarioBuilder:
        self._description = description
        return self

    def with_start_time(self, start_time: datetime) -> ScenarioBuilder:
        self._start_time = start_time
        return self

    def with_duration(self, days: int) -> ScenarioBuilder:
        self._duration = timedelta(days=days)
        return self

    def with_uncertainty(self, uncertainty: float) -> ScenarioBuilder:
        self._uncertainty = max(0.0, min(1.0, uncertainty))
        return self

    def add_event(self, event: InjectedEvent) -> ScenarioBuilder:
        self._events.append(event)
        return self

    def add_assumption(self, assumption: Assumption) -> ScenarioBuilder:
        self._assumptions.add_assumption(assumption)
        return self

    def add_tag(self, tag: str) -> ScenarioBuilder:
        self._tags.append(tag)
        return self

    def with_metadata(self, key: str, value: Any) -> ScenarioBuilder:
        self._metadata[key] = value
        return self

    def quick_build(
        self,
        title: str,
        description: str,
        events: List[Dict[str, Any]],
        assumptions: Optional[List[Dict[str, Any]]] = None,
        duration_days: int = 365,
    ) -> Scenario:
        self.with_title(title).with_description(description).with_duration(duration_days)
        for e in events:
            self.add_event(InjectedEvent(
                event_type=EventType(e.get("type", "default")),
                title=e.get("title", ""),
                description=e.get("description", ""),
                countries=e.get("countries", []),
                severity=e.get("severity", 0.5),
            ))
        if assumptions:
            for a in assumptions:
                self.add_assumption(Assumption(
                    id=a.get("id", str(uuid.uuid4())),
                    description=a.get("description", ""),
                    probability=a.get("probability", 0.5),
                    category=a.get("category", "general"),
                    depends_on=a.get("depends_on", []),
                ))
        return self.build()

    def build(self) -> Scenario:
        return Scenario(
            id=self._id,
            title=self._title,
            description=self._description,
            assumptions=self._assumptions,
            injected_events=self._events,
            start_time=self._start_time,
            duration=self._duration,
            expected_uncertainty=self._uncertainty,
            tags=self._tags,
            metadata=self._metadata,
        )

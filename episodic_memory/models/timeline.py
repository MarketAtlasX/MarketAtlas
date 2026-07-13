from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class TimelineEvent(BaseModel):
    date: datetime
    title: str
    description: str
    source: Optional[str] = None
    event_type: str = "general"
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    impact_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    entities_involved: list[str] = Field(default_factory=list)
    market_impact: Optional[dict] = None


class Timeline(BaseModel):
    events: list[TimelineEvent] = Field(default_factory=list)

    def add_event(self, event: TimelineEvent) -> None:
        self.events.append(event)
        self.events.sort(key=lambda e: e.date)

    def earliest(self) -> Optional[datetime]:
        if not self.events:
            return None
        return self.events[0].date

    def latest(self) -> Optional[datetime]:
        if not self.events:
            return None
        return self.events[-1].date

    def duration_days(self) -> Optional[int]:
        if not self.events:
            return None
        delta = self.latest() - self.earliest()
        return delta.days

    def filter_by_type(self, event_type: str) -> list[TimelineEvent]:
        return [e for e in self.events if e.event_type == event_type]

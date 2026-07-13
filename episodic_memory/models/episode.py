from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional

from .participant import Participant
from .outcome import Outcome
from .timeline import Timeline, TimelineEvent


class Episode(BaseModel):
    id: str
    title: str
    summary: str
    timeline: Timeline = Field(default_factory=Timeline)
    participants: list[Participant] = Field(default_factory=list)
    locations: list[str] = Field(default_factory=list)
    entities: list[str] = Field(default_factory=list)
    commodities: list[str] = Field(default_factory=list)
    sectors: list[str] = Field(default_factory=list)
    market_reaction: dict = Field(default_factory=dict)
    world_state_before: dict = Field(default_factory=dict)
    world_state_after: dict = Field(default_factory=dict)
    embeddings: list[float] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    outcomes: list[Outcome] = Field(default_factory=list)
    lessons: list[str] = Field(default_factory=list)
    references: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    cluster_id: Optional[str] = None
    parent_episode_id: Optional[str] = None
    child_episode_ids: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    source_count: int = 0
    is_meta: bool = False

    def add_timeline_event(self, event: TimelineEvent) -> None:
        self.timeline.add_event(event)
        self.updated_at = datetime.utcnow()

    def add_outcome(self, outcome: Outcome) -> None:
        self.outcomes.append(outcome)
        self.updated_at = datetime.utcnow()

    def add_lesson(self, lesson: str) -> None:
        if lesson not in self.lessons:
            self.lessons.append(lesson)
            self.updated_at = datetime.utcnow()

    def add_participant(self, participant: Participant) -> None:
        existing = [p for p in self.participants if p.name == participant.name]
        if not existing:
            self.participants.append(participant)
            self.updated_at = datetime.utcnow()

    def merge_outcomes(self, other: "Episode") -> None:
        existing_metrics = {(o.category, o.metric, o.timestamp) for o in self.outcomes}
        for o in other.outcomes:
            if (o.category, o.metric, o.timestamp) not in existing_metrics:
                self.outcomes.append(o)

    def to_embedding_text(self) -> str:
        parts = [
            self.title,
            self.summary,
            " ".join(self.entities),
            " ".join(self.sectors),
            " ".join(self.locations),
            " ".join(self.commodities),
            " ".join(f"{o.metric}: {o.value} {o.direction}" for o in self.outcomes),
            " ".join(e.title for e in self.timeline.events),
        ]
        return " ".join(p for p in parts if p)

    def dict_summary(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "summary": self.summary[:200] if self.summary else "",
            "participants": [p.name for p in self.participants],
            "locations": self.locations,
            "entities": self.entities,
            "sectors": self.sectors,
            "commodities": self.commodities,
            "outcome_count": len(self.outcomes),
            "lesson_count": len(self.lessons),
            "timeline_events": len(self.timeline.events),
            "confidence": self.confidence,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

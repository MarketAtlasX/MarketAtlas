from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional


class FactCategory(str, Enum):
    GEOPOLITICAL = "geopolitical"
    ECONOMIC = "economic"
    TRADE = "trade"
    MILITARY = "military"
    RESOURCE = "resource"
    DEMOGRAPHIC = "demographic"
    TECHNOLOGICAL = "technological"


class Fact(BaseModel):
    id: str
    subject: str
    predicate: str
    object: str
    category: FactCategory = FactCategory.GEOPOLITICAL
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    source_episode_ids: list[str] = Field(default_factory=list)
    source_urls: list[str] = Field(default_factory=list)
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class SemanticGraph(BaseModel):
    facts: list[Fact] = Field(default_factory=list)

    def add_fact(self, fact: Fact) -> None:
        existing = [
            f
            for f in self.facts
            if f.subject == fact.subject
            and f.predicate == fact.predicate
            and f.object == fact.object
        ]
        if not existing:
            self.facts.append(fact)

    def query(
        self,
        subject: Optional[str] = None,
        predicate: Optional[str] = None,
        object: Optional[str] = None,
        category: Optional[FactCategory] = None,
    ) -> list[Fact]:
        results = self.facts
        if subject:
            results = [f for f in results if f.subject == subject]
        if predicate:
            results = [f for f in results if f.predicate == predicate]
        if object:
            results = [f for f in results if f.object == object]
        if category:
            results = [f for f in results if f.category == category]
        return results

    def get_relations(self, entity: str) -> dict[str, list[str]]:
        outgoing = {}
        incoming = {}
        for f in self.facts:
            if f.subject == entity:
                outgoing.setdefault(f.predicate, []).append(f.object)
            if f.object == entity:
                incoming.setdefault(f.predicate, []).append(f.subject)
        return {"outgoing": outgoing, "incoming": incoming}

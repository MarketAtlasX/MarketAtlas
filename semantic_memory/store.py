from typing import Optional

from .models import Fact, FactCategory, SemanticGraph


class SemanticStore:
    def __init__(self):
        self.graph = SemanticGraph()

    def store_fact(self, fact: Fact) -> None:
        self.graph.add_fact(fact)

    def store_facts(self, facts: list[Fact]) -> None:
        for fact in facts:
            self.graph.add_fact(fact)

    def query(
        self,
        subject: Optional[str] = None,
        predicate: Optional[str] = None,
        object: Optional[str] = None,
        category: Optional[FactCategory] = None,
    ) -> list[Fact]:
        return self.graph.query(
            subject=subject,
            predicate=predicate,
            object=object,
            category=category,
        )

    def get_entity_facts(self, entity: str) -> dict[str, list[str]]:
        return self.graph.get_relations(entity)

    def search_facts(self, query: str) -> list[Fact]:
        q = query.lower()
        results = []
        for fact in self.graph.facts:
            if (
                q in fact.subject.lower()
                or q in fact.object.lower()
                or q in fact.predicate.lower()
            ):
                results.append(fact)
        return results

    def get_all_facts(self) -> list[Fact]:
        return self.graph.facts

    def count(self) -> int:
        return len(self.graph.facts)

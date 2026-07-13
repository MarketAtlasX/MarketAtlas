from typing import Optional

from .models import Procedure


class ProceduralStore:
    def __init__(self):
        self._procedures: dict[str, Procedure] = {}

    def store(self, procedure: Procedure) -> None:
        self._procedures[procedure.id] = procedure

    def get(self, procedure_id: str) -> Optional[Procedure]:
        return self._procedures.get(procedure_id)

    def find_by_category(self, category: str) -> list[Procedure]:
        return [
            p for p in self._procedures.values() if p.category == category
        ]

    def find_by_trigger(self, trigger: str) -> list[Procedure]:
        return [
            p
            for p in self._procedures.values()
            if trigger in p.triggers
        ]

    def find_by_episode(self, episode_id: str) -> list[Procedure]:
        return [
            p
            for p in self._procedures.values()
            if episode_id in p.source_episode_ids
        ]

    def get_all(self) -> list[Procedure]:
        return list(self._procedures.values())

    def count(self) -> int:
        return len(self._procedures)

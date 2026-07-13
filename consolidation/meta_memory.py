import uuid
from datetime import datetime
from typing import Optional

from episodic_memory.models import Episode


class MetaMemoryBuilder:
    def build_meta_episode(
        self,
        episodes: list[Episode],
        title: Optional[str] = None,
    ) -> Episode:
        if not episodes:
            raise ValueError("Cannot build meta-episode from empty list")

        primary = episodes[0]
        all_lessons = set()
        all_sectors = set()
        all_locations = set()
        all_entities = set()
        all_commodities = set()

        for ep in episodes:
            all_lessons.update(ep.lessons)
            all_sectors.update(ep.sectors)
            all_locations.update(ep.locations)
            all_entities.update(ep.entities)
            all_commodities.update(ep.commodities)

        meta = Episode(
            id=f"meta-{uuid.uuid4().hex[:12]}",
            title=title or self._generate_title(episodes),
            summary=self._generate_summary(episodes),
            participants=primary.participants[:],
            locations=sorted(all_locations),
            entities=sorted(all_entities),
            commodities=sorted(all_commodities),
            sectors=sorted(all_sectors),
            lessons=list(all_lessons),
            is_meta=True,
            child_episode_ids=[ep.id for ep in episodes],
            source_count=sum(ep.source_count for ep in episodes),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        for ep in episodes:
            for event in ep.timeline.events:
                meta.add_timeline_event(event)
            meta.merge_outcomes(ep)

        return meta

    def _generate_title(self, episodes: list[Episode]) -> str:
        locations = set()
        for ep in episodes:
            locations.update(ep.locations)
        loc_str = ", ".join(sorted(locations)[:3])
        return f"Meta: Geopolitical Events in {loc_str}" if loc_str else "Meta: Consolidated Events"

    def _generate_summary(self, episodes: list[Episode]) -> str:
        summaries = [ep.summary for ep in episodes if ep.summary]
        if not summaries:
            return "Consolidated memory from multiple related episodes"
        return " | ".join(s[:200] for s in summaries[:3])

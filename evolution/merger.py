import uuid
from datetime import datetime
from typing import Optional

from episodic_memory.models import Episode, Participant, Timeline, TimelineEvent


class EpisodeMerger:
    def merge(self, episodes: list[Episode], new_id: Optional[str] = None) -> Episode:
        if not episodes:
            raise ValueError("Cannot merge empty list")
        if len(episodes) == 1:
            return episodes[0]

        primary = episodes[0]
        merged = Episode(
            id=new_id or f"ep-{uuid.uuid4().hex[:12]}",
            title=self._merge_title(episodes),
            summary=self._merge_summary(episodes),
            participants=self._merge_participants(episodes),
            locations=self._merge_string_lists([e.locations for e in episodes]),
            entities=self._merge_string_lists([e.entities for e in episodes]),
            commodities=self._merge_string_lists(
                [e.commodities for e in episodes]
            ),
            sectors=self._merge_string_lists([e.sectors for e in episodes]),
            market_reaction=self._merge_dicts(
                [e.market_reaction for e in episodes]
            ),
            world_state_before=primary.world_state_before,
            world_state_after=episodes[-1].world_state_after,
            confidence=max(e.confidence for e in episodes),
            source_count=sum(e.source_count for e in episodes),
            tags=self._merge_string_lists([e.tags for e in episodes]),
            is_meta=True,
            parent_episode_id=primary.parent_episode_id or primary.id,
            child_episode_ids=[e.id for e in episodes],
        )

        for ep in episodes:
            for event in ep.timeline.events:
                merged.add_timeline_event(event)
            merged.merge_outcomes(ep)

        all_lessons = set()
        for ep in episodes:
            all_lessons.update(ep.lessons)
        merged.lessons = list(all_lessons)

        merged.updated_at = datetime.utcnow()
        return merged

    def _merge_title(self, episodes: list[Episode]) -> str:
        titles = [ep.title for ep in episodes if ep.title]
        if not titles:
            return "Merged Episode"
        if len(set(titles)) == 1:
            return titles[0]
        return " / ".join(sorted(set(titles))[:3])

    def _merge_summary(self, episodes: list[Episode]) -> str:
        summaries = []
        for ep in episodes:
            if ep.summary:
                summaries.append(ep.summary)
        best = max(summaries, key=len) if summaries else ""
        return best[:1000]

    def _merge_participants(
        self, episodes: list[Episode]
    ) -> list[Participant]:
        seen = set()
        participants = []
        for ep in episodes:
            for p in ep.participants:
                if p.name not in seen:
                    seen.add(p.name)
                    participants.append(p)
        return participants

    def _merge_string_lists(self, lists: list[list[str]]) -> list[str]:
        seen = set()
        result = []
        for lst in lists:
            for item in lst:
                if item not in seen:
                    seen.add(item)
                    result.append(item)
        return result

    def _merge_dicts(self, dicts: list[dict]) -> dict:
        merged = {}
        for d in dicts:
            merged.update(d)
        return merged

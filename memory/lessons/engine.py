from collections import Counter, defaultdict
from typing import Any

from episodic_memory.models import Episode, Outcome, OutcomeCategory
from .templates import LessonTemplates


class LessonEngine:
    def __init__(self):
        self.templates = LessonTemplates()

    def generate(self, episode: Episode) -> list[str]:
        lessons = []
        lessons.extend(self.templates.apply_market_lessons(episode))
        lessons.extend(self.templates.apply_conflict_lessons(episode))
        lessons.extend(self.templates.apply_supply_lessons(episode))
        lessons.extend(self.templates.apply_diplomatic_lessons(episode))

        derived = self._derive_patterns(episode)
        lessons.extend(derived)

        seen = set()
        return [l for l in lessons if not (l in seen or seen.add(l))]

    def generate_cross_episode(
        self, episodes: list[Episode], min_occurrences: int = 2
    ) -> list[dict]:
        all_lessons: list[tuple[str, str]] = []

        for ep in episodes:
            for lesson in ep.lessons:
                all_lessons.append((ep.id, lesson))

        lesson_counts: dict[str, int] = Counter()
        lesson_episodes: dict[str, list[str]] = defaultdict(list)

        for ep_id, lesson in all_lessons:
            lesson_counts[lesson] += 1
            lesson_episodes[lesson].append(ep_id)

        return [
            {
                "lesson": lesson,
                "occurrences": count,
                "episode_ids": lesson_episodes[lesson],
                "confidence": min(1.0, count / min_occurrences),
            }
            for lesson, count in lesson_counts.items()
            if count >= min_occurrences
        ]

    def _derive_patterns(self, episode: Episode) -> list[str]:
        patterns = []

        military_events = [
            e for e in episode.timeline.events if e.event_type == "military"
        ]
        market_events = [
            e for e in episode.timeline.events if e.event_type == "market"
        ]

        if military_events and market_events:
            gap = (market_events[0].date - military_events[0].date).days
            patterns.append(
                f"Market reaction follows military escalation by approximately {max(1, gap)} days"
            )

        if episode.commodities and any(
            o.category == OutcomeCategory.MARKET for o in episode.outcomes
        ):
            commodity_str = ", ".join(episode.commodities[:3])
            patterns.append(
                f"Commodity exposure ({commodity_str}) is a key transmission mechanism for this event type"
            )

        participant_count = len(episode.participants)
        if participant_count >= 3:
            patterns.append(
                f"Multi-party conflicts ({participant_count} participants) tend to have prolonged resolution timelines"
            )

        sanctions_present = any(
            "sanction" in o.description.lower() or "sanction" in o.metric.lower()
            for o in episode.outcomes
        )
        if sanctions_present:
            patterns.append(
                "Sanctions create secondary inflationary effects beyond direct trade impact"
            )

        return patterns

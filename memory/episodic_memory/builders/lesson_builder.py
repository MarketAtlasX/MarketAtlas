from collections import defaultdict
from typing import Any

from episodic_memory.models import Episode, Outcome


class LessonBuilder:
    def __init__(self):
        self._templates = {
            "market": "{condition} typically produces {effect} in {sector}",
            "sanctions": "Sanctions on {target} lead to {effect} within {timeframe}",
            "conflict": "Armed conflict in {location} causes {effect} lasting {duration}",
            "supply": "Supply disruption of {commodity} results in {effect} over {timeframe}",
            "diplomatic": "Diplomatic resolution in {location} leads to {effect}",
        }

    def generate(self, episode: Episode) -> list[str]:
        lessons = []
        lessons.extend(self._from_outcomes(episode))
        lessons.extend(self._from_timeline_patterns(episode))
        lessons.extend(self._from_entities_and_sectors(episode))
        return lessons

    def _from_outcomes(self, episode: Episode) -> list[str]:
        lessons = []
        market_outcomes = [
            o for o in episode.outcomes if o.category.value == "market"
        ]
        for outcome in market_outcomes:
            template = self._templates.get("market", "{condition} leads to {effect}")
            location_str = ", ".join(episode.locations[:2]) or "geopolitical events"
            sector_str = ", ".join(episode.sectors[:2]) or "markets"
            lessons.append(
                template.format(
                    condition=f"Escalation in {location_str}",
                    effect=f"{outcome.direction} movement in {outcome.metric} ({outcome.value}{outcome.unit})",
                    sector=sector_str,
                )
            )

        sanctions_outcomes = [
            o for o in episode.outcomes
            if "sanction" in o.description.lower() or "sanction" in o.metric.lower()
        ]
        for outcome in sanctions_outcomes[:2]:
            target = ", ".join(
                [p.name for p in episode.participants if p.role.value == "target"]
            ) or "target"
            lessons.append(
                self._templates["sanctions"].format(
                    target=target,
                    effect=f"{outcome.value}{outcome.unit} change in {outcome.metric}",
                    timeframe="30-90 days",
                )
            )

        return lessons

    def _from_timeline_patterns(self, episode: Episode) -> list[str]:
        lessons = []
        events = episode.timeline.events
        if len(events) < 3:
            return lessons

        conflict_events = [e for e in events if e.event_type == "military"]
        market_events = [e for e in events if e.event_type == "market"]

        if conflict_events and market_events:
            first_conflict = conflict_events[0]
            first_market = market_events[0]
            delta = (first_market.date - first_conflict.date).days
            location = ", ".join(episode.locations[:2]) or "region"
            commodity = ", ".join(episode.commodities[:1]) or "assets"
            lessons.append(
                f"Military action in {location} affects {commodity} within ~{max(1, delta)} days"
            )

        supply_events = [e for e in events if e.event_type == "economic"]
        if supply_events and episode.commodities:
            commodity = ", ".join(episode.commodities[:2])
            lessons.append(
                f"Supply disruption of {commodity} leads to ripple effects in related sectors"
            )

        return lessons

    def _from_entities_and_sectors(self, episode: Episode) -> list[str]:
        lessons = []
        if len(episode.participants) >= 2:
            names = [p.name for p in episode.participants[:3]]
            lessons.append(
                f"Multi-party involvement ({', '.join(names)}) increases outcome uncertainty"
            )

        if episode.sectors:
            sector_str = ", ".join(episode.sectors[:3])
            lessons.append(f"Primary sectors affected: {sector_str}")

        return lessons

    def generate_cross_episode(
        self, episodes: list[Episode], min_occurrences: int = 2
    ) -> list[str]:
        all_lessons: list[str] = []
        for ep in episodes:
            all_lessons.extend(ep.lessons)

        pattern_counts: dict[str, int] = defaultdict(int)
        for lesson in all_lessons:
            for ep in episodes:
                if lesson in ep.lessons:
                    pattern_counts[lesson] += 1

        return [
            lesson
            for lesson, count in pattern_counts.items()
            if count >= min_occurrences
        ]

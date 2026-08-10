from collections import Counter
from datetime import datetime
from typing import Any, Optional

from episodic_memory.models import Episode, Outcome, TimelineEvent


class MemoryCompressor:
    def compress(self, episode: Episode, max_events: int = 10) -> Episode:
        if len(episode.timeline.events) <= max_events:
            return episode

        sorted_events = sorted(episode.timeline.events, key=lambda e: e.date)
        kept_events = self._select_representative_events(
            sorted_events, max_events
        )

        episode.timeline.events = kept_events
        episode.summary = self._compress_summary(episode.summary, 500)
        episode.updated_at = datetime.utcnow()

        return episode

    def _select_representative_events(
        self, events: list[TimelineEvent], max_count: int
    ) -> list[TimelineEvent]:
        if len(events) <= max_count:
            return events

        n = len(events)
        indices = set()

        indices.add(0)
        indices.add(n - 1)

        type_counts: dict[str, int] = Counter()
        for e in events:
            type_counts[e.event_type] += 1

        for etype, _ in type_counts.most_common():
            for i in range(1, n - 1):
                if events[i].event_type == etype and i not in indices:
                    indices.add(i)
                    if len(indices) >= max_count:
                        break
            if len(indices) >= max_count:
                break

        while len(indices) < max_count and len(indices) < n:
            for i in range(1, n - 1):
                if i not in indices:
                    indices.add(i)
                    if len(indices) >= max_count:
                        break

        sorted_indices = sorted(indices)
        return [events[i] for i in sorted_indices]

    def _compress_summary(self, summary: str, max_length: int) -> str:
        if len(summary) <= max_length:
            return summary
        return summary[:max_length] + "..."

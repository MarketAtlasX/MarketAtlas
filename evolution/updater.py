from datetime import datetime
from typing import Any, Optional

from episodic_memory.models import Episode, Outcome, TimelineEvent


class EpisodeUpdater:
    def update_with_articles(
        self, episode: Episode, new_articles: list[dict]
    ) -> Episode:
        for article in new_articles:
            self._add_event_from_article(episode, article)
            self._merge_metadata(episode, article)

        episode.source_count += len(new_articles)
        episode.confidence = min(1.0, episode.confidence + len(new_articles) * 0.05)
        episode.updated_at = datetime.utcnow()

        return episode

    def update_with_outcome(
        self, episode: Episode, outcome: Outcome
    ) -> Episode:
        episode.add_outcome(outcome)
        episode.updated_at = datetime.utcnow()
        return episode

    def _add_event_from_article(
        self, episode: Episode, article: dict
    ) -> None:
        event = TimelineEvent(
            date=self._parse_date(article),
            title=article.get("title", "Update")[:200],
            description=(
                article.get("summary") or article.get("description") or ""
            )[:500],
            source=article.get("url"),
            confidence=0.5,
        )
        episode.add_timeline_event(event)

    def _merge_metadata(self, episode: Episode, article: dict) -> None:
        for loc in article.get("locations", []):
            name = loc if isinstance(loc, str) else loc.get("name", "")
            if name and name not in episode.locations:
                episode.locations.append(name)

        for ent in article.get("entities", []):
            name = ent if isinstance(ent, str) else ent.get("name", "")
            if name and name not in episode.entities:
                episode.entities.append(name)

        url = article.get("url")
        if url and url not in episode.references:
            episode.references.append(url)

    def _parse_date(self, article: dict) -> datetime:
        raw = (
            article.get("published_at")
            or article.get("timestamp")
            or article.get("date")
        )
        if raw is None:
            return datetime.utcnow()
        if isinstance(raw, datetime):
            return raw
        try:
            return datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return datetime.utcnow()

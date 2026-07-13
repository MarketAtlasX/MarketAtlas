import uuid
from datetime import datetime
from typing import Any, Optional

from episodic_memory.models import Episode, Participant, Timeline, TimelineEvent

from .timeline_builder import TimelineBuilder
from .lesson_builder import LessonBuilder


class EpisodeBuilder:
    def __init__(self):
        self.timeline_builder = TimelineBuilder()
        self.lesson_builder = LessonBuilder()

    def build(
        self,
        articles: list[dict],
        cluster_id: Optional[str] = None,
        episode_id: Optional[str] = None,
    ) -> Episode:
        if not articles:
            raise ValueError("Cannot build episode from empty article list")

        episode = Episode(
            id=episode_id or f"ep-{uuid.uuid4().hex[:12]}",
            title=self._extract_title(articles),
            summary=self._build_summary(articles),
            timeline=self.timeline_builder.build(articles),
            participants=self._extract_participants(articles),
            locations=self._extract_locations(articles),
            entities=self._extract_entities(articles),
            commodities=self._extract_commodities(articles),
            sectors=self._extract_sectors(articles),
            confidence=self._compute_confidence(articles),
            source_count=len(articles),
            cluster_id=cluster_id,
            world_state_before=self._extract_world_state(articles, "before"),
            world_state_after=self._extract_world_state(articles, "after"),
            tags=self._extract_tags(articles),
            references=[a.get("url", "") for a in articles if a.get("url")],
        )

        episode.lessons = self.lesson_builder.generate(episode)
        return episode

    def _extract_title(self, articles: list[dict]) -> str:
        titles = [a.get("title", "") for a in articles if a.get("title")]
        if not titles:
            return "Unnamed Geopolitical Event"

        title_groups: dict[str, int] = {}
        for t in titles:
            key = t.lower().strip()
            title_groups[key] = title_groups.get(key, 0) + 1

        best_title = max(title_groups, key=title_groups.get)
        return titles[
            [t.lower().strip() for t in titles].index(best_title)
        ][:200]

    def _build_summary(self, articles: list[dict]) -> str:
        summaries = []
        for a in articles:
            for field in ["summary", "description", "content", "body"]:
                val = a.get(field)
                if val and isinstance(val, str) and len(val) > 20:
                    summaries.append(val)
                    break

        if not summaries:
            return " ".join(a.get("title", "") for a in articles[:5])

        best = max(summaries, key=len)
        return best[:1000] if len(best) > 1000 else best

    def _extract_participants(self, articles: list[dict]) -> list[Participant]:
        seen = set()
        participants = []
        for a in articles:
            for p in a.get("participants", []):
                if isinstance(p, dict):
                    name = p.get("name", "")
                    if name and name not in seen:
                        seen.add(name)
                        participants.append(Participant(**p))
                elif isinstance(p, str) and p not in seen:
                    seen.add(p)
                    participants.append(Participant(name=p))
        return participants

    def _extract_locations(self, articles: list[dict]) -> list[str]:
        seen = set()
        locations = []
        for a in articles:
            for loc in a.get("locations", []):
                if isinstance(loc, str) and loc not in seen:
                    seen.add(loc)
                    locations.append(loc)
                elif isinstance(loc, dict):
                    name = loc.get("name", "")
                    if name and name not in seen:
                        seen.add(name)
                        locations.append(name)
        return locations

    def _extract_entities(self, articles: list[dict]) -> list[str]:
        seen = set()
        entities = []
        for a in articles:
            for e in a.get("entities", []):
                if isinstance(e, str) and e not in seen:
                    seen.add(e)
                    entities.append(e)
                elif isinstance(e, dict):
                    name = e.get("name", "")
                    if name and name not in seen:
                        seen.add(name)
                        entities.append(name)
        return entities

    def _extract_commodities(self, articles: list[dict]) -> list[str]:
        seen = set()
        commodities = []
        for a in articles:
            for c in a.get("commodities", []):
                if isinstance(c, str) and c not in seen:
                    seen.add(c)
                    commodities.append(c)
        return commodities

    def _extract_sectors(self, articles: list[dict]) -> list[str]:
        keyword_to_sector = {
            "oil": "energy", "gas": "energy", "energy": "energy",
            "gold": "commodities", "copper": "commodities", "commodity": "commodities",
            "tech": "technology", "semiconductor": "technology", "chip": "technology",
            "bank": "financial", "finance": "financial", "interest": "financial",
            "agriculture": "agriculture", "food": "agriculture", "wheat": "agriculture",
            "defense": "defense", "military": "defense", "weapon": "defense",
            "health": "healthcare", "pharma": "healthcare", "vaccine": "healthcare",
            "shipping": "logistics", "logistics": "logistics", "supply chain": "logistics",
        }

        seen = set()
        sectors = set()
        full_text = " ".join(
            a.get("title", "") + " " + a.get("summary", "") for a in articles
        ).lower()

        for kw, sector in keyword_to_sector.items():
            if kw in full_text and sector not in seen:
                seen.add(sector)
                sectors.add(sector)

        for a in articles:
            for s in a.get("sectors", []):
                if isinstance(s, str) and s not in seen:
                    seen.add(s)
                    sectors.add(s)

        return sorted(sectors)

    def _compute_confidence(self, articles: list[dict]) -> float:
        if not articles:
            return 0.0
        score = min(1.0, len(articles) / 15.0)
        source_types = set()
        for a in articles:
            st = a.get("source_type") or a.get("source")
            if st:
                source_types.add(st)
        score += min(0.3, len(source_types) * 0.1)
        return min(1.0, score)

    def _extract_world_state(self, articles: list[dict], timing: str) -> dict:
        state = {
            "timestamp": datetime.utcnow().isoformat(),
            "source_count": len(articles),
        }
        market_data = []
        for a in articles:
            md = a.get(f"market_{timing}") or a.get("market_data", {})
            if md:
                market_data.append(md)
        if market_data:
            state["market_context"] = market_data
        return state

    def _extract_tags(self, articles: list[dict]) -> list[str]:
        seen = set()
        tags = []
        for a in articles:
            for t in a.get("tags", []) or a.get("categories", []):
                if isinstance(t, str) and t not in seen:
                    seen.add(t)
                    tags.append(t)
        return tags

from collections import defaultdict
from datetime import datetime
from typing import Any, Optional

from episodic_memory.models import Timeline, TimelineEvent


class TimelineBuilder:
    def __init__(self):
        self._event_keywords = {
            "military": [
                "attack", "strike", "invasion", "troop", "missile",
                "bomb", "war", "conflict", "ceasefire", "sanction",
            ],
            "diplomatic": [
                "summit", "treaty", "negotiation", "talks", "meeting",
                "agreement", "accord", "alliance", "ambassador",
            ],
            "economic": [
                "tariff", "trade", "sanction", "embargo", "inflation",
                "interest rate", "gdp", "recession", "debt",
            ],
            "market": [
                "market", "stock", "oil", "commodity", "futures",
                "index", "rally", "crash", "volatility",
            ],
            "humanitarian": [
                "refugee", "aid", "casualty", "civilian", "crisis",
                "displacement", "famine", "health",
            ],
        }

    def build(self, articles: list[dict]) -> Timeline:
        timeline = Timeline()
        grouped = self._group_by_date(articles)

        for date_key, group in sorted(grouped.items()):
            event = self._create_event(date_key, group)
            timeline.add_event(event)

        return timeline

    def _group_by_date(self, articles: list[dict]) -> dict[str, list[dict]]:
        grouped: dict[str, list[dict]] = defaultdict(list)
        for art in articles:
            date = self._extract_date(art)
            grouped[date].append(art)
        return grouped

    def _extract_date(self, article: dict) -> str:
        raw = (
            article.get("published_at")
            or article.get("timestamp")
            or article.get("date")
        )
        if raw is None:
            return datetime.utcnow().strftime("%Y-%m-%d")
        if isinstance(raw, datetime):
            return raw.strftime("%Y-%m-%d")
        try:
            dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
            return dt.strftime("%Y-%m-%d")
        except (ValueError, TypeError):
            return str(raw)[:10]

    def _create_event(self, date_key: str, group: list[dict]) -> TimelineEvent:
        titles = [a.get("title", "") for a in group if a.get("title")]
        best_title = max(titles, key=len) if titles else "Event"

        summaries = [
            a.get("summary", "") or a.get("description", "") or a.get("content", "")[:300]
            for a in group
        ]
        description = max(summaries, key=len) if summaries else ""

        event_type = self._classify_event_type(best_title + " " + description)

        try:
            dt = datetime.strptime(date_key, "%Y-%m-%d")
        except ValueError:
            dt = datetime.utcnow()

        entities = set()
        for a in group:
            for e in a.get("entities", []):
                if isinstance(e, str):
                    entities.add(e)
                elif isinstance(e, dict):
                    entities.add(e.get("name", ""))

        return TimelineEvent(
            date=dt,
            title=best_title[:200],
            description=description[:500],
            event_type=event_type,
            confidence=min(1.0, len(group) / 10.0),
            entities_involved=sorted(entities),
        )

    def _classify_event_type(self, text: str) -> str:
        text_lower = text.lower()
        scores: dict[str, int] = defaultdict(int)
        for etype, keywords in self._event_keywords.items():
            for kw in keywords:
                if kw in text_lower:
                    scores[etype] += 1
        if not scores:
            return "general"
        return max(scores, key=scores.get)

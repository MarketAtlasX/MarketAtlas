import re
import uuid
from typing import Any

from .models import Fact, FactCategory


class SemanticExtractor:
    def __init__(self):
        self._patterns = {
            FactCategory.TRADE: [
                (r"(\w+)\s+(exports|imports|produces|supplies)\s+([\w\s]+)", 1, 2, 3),
            ],
            FactCategory.GEOPOLITICAL: [
                (r"(\w+)\s+(sanctions|invades|attacks|negotiates|withdraws from)\s+([\w\s]+)", 1, 2, 3),
                (r"(\w+)\s+joins\s+([\w\s]+)", 1, "joins", 2),
            ],
            FactCategory.RESOURCE: [
                (r"([\w\s]+)\s+(holds|controls|produces)\s+(\d+[%\s]+\w+)", 1, 2, 3),
            ],
            FactCategory.ECONOMIC: [
                (r"(\w+)\s+(gdp|inflation|unemployment|debt)\s+(rose|fell|increased|decreased)\s+to\s+([\d.]+)", 1, 2, 4),
            ],
        }

    def extract(self, text: str, source_episode_id: str = "") -> list[Fact]:
        facts = []
        for category, patterns in self._patterns.items():
            for pattern, subj_idx, pred_idx, obj_idx in patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                for match in matches:
                    subject = match.group(subj_idx).strip()
                    predicate = match.group(pred_idx).strip().lower()
                    obj = match.group(obj_idx).strip()

                    fact = Fact(
                        id=f"fact-{uuid.uuid4().hex[:10]}",
                        subject=subject,
                        predicate=predicate,
                        object=obj,
                        category=category,
                        source_episode_ids=[source_episode_id] if source_episode_id else [],
                    )
                    facts.append(fact)

        return facts

    def extract_from_episode(
        self, episode_text: str, episode_id: str
    ) -> list[Fact]:
        return self.extract(episode_text, source_episode_id=episode_id)

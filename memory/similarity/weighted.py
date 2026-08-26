from episodic_memory.models import Episode


class WeightedSimilarity:
    def __init__(
        self,
        event_weight: float = 0.25,
        entity_weight: float = 0.20,
        sector_weight: float = 0.15,
        location_weight: float = 0.10,
        market_weight: float = 0.15,
        timeline_weight: float = 0.10,
        graph_weight: float = 0.05,
    ):
        self.event_weight = event_weight
        self.entity_weight = entity_weight
        self.sector_weight = sector_weight
        self.location_weight = location_weight
        self.market_weight = market_weight
        self.timeline_weight = timeline_weight
        self.graph_weight = graph_weight
        self._model = None

    def compute(
        self,
        episode_a: Episode,
        episode_b: Episode,
        embedding_dim: int = 384,
    ) -> float:
        components: list[tuple[str, float]] = []

        event_score = self._event_similarity(episode_a, episode_b)
        components.append(("event", event_score, self.event_weight))

        entity_score = self._set_similarity(
            set(episode_a.entities), set(episode_b.entities)
        )
        components.append(("entity", entity_score, self.entity_weight))

        sector_score = self._set_similarity(
            set(episode_a.sectors), set(episode_b.sectors)
        )
        components.append(("sector", sector_score, self.sector_weight))

        location_score = self._set_similarity(
            set(episode_a.locations), set(episode_b.locations)
        )
        components.append(("location", location_score, self.location_weight))

        market_score = self._market_similarity(episode_a, episode_b)
        components.append(("market", market_score, self.market_weight))

        timeline_score = self._timeline_similarity(episode_a, episode_b)
        components.append(("timeline", timeline_score, self.timeline_weight))

        graph_score = self._graph_similarity(episode_a, episode_b)
        components.append(("graph", graph_score, self.graph_weight))

        total = sum(weight * score for _, score, weight in components)
        return float(total)

    def _get_model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer("all-MiniLM-L6-v2")
        return self._model

    def _event_similarity(self, a: Episode, b: Episode) -> float:
        text_a = a.to_embedding_text()[:500]
        text_b = b.to_embedding_text()[:500]

        if a.model_dump() == b.model_dump():
            return 1.0

        if not text_a and not text_b:
            return 1.0

        if not text_a or not text_b:
            return 0.0

        tokens_a = text_a.split()[:100]
        tokens_b = text_b.split()[:100]

        if tokens_a == tokens_b:
            return 1.0

        try:
            from sklearn.metrics.pairwise import cosine_similarity

            model = self._get_model()
            emb_a = model.encode(text_a)
            emb_b = model.encode(text_b)
            sim = cosine_similarity([emb_a], [emb_b])[0][0]
            return float(max(0.0, min(1.0, sim)))
        except Exception:
            return self._jaccard_similarity(tokens_a, tokens_b)

    def _set_similarity(self, set_a: set, set_b: set) -> float:
        if not set_a and not set_b:
            return 1.0
        if not set_a or not set_b:
            return 0.0
        intersection = set_a & set_b
        union = set_a | set_b
        return len(intersection) / len(union)

    def _market_similarity(self, a: Episode, b: Episode) -> float:
        commodities_a = set(a.commodities)
        commodities_b = set(b.commodities)
        c_score = self._set_similarity(commodities_a, commodities_b)

        outcomes_a = {(o.category.value, o.metric) for o in a.outcomes}
        outcomes_b = {(o.category.value, o.metric) for o in b.outcomes}
        o_score = self._set_similarity(outcomes_a, outcomes_b)

        return 0.5 * c_score + 0.5 * o_score

    def _timeline_similarity(self, a: Episode, b: Episode) -> float:
        types_a = {e.event_type for e in a.timeline.events}
        types_b = {e.event_type for e in b.timeline.events}
        return self._set_similarity(types_a, types_b)

    def _graph_similarity(self, a: Episode, b: Episode) -> float:
        participants_a = {p.name for p in a.participants}
        participants_b = {p.name for p in b.participants}
        return self._set_similarity(participants_a, participants_b)

    def _jaccard_similarity(self, tokens_a: list[str], tokens_b: list[str]) -> float:
        set_a, set_b = set(tokens_a), set(tokens_b)
        if not set_a and not set_b:
            return 1.0
        if not set_a or not set_b:
            return 0.0
        return len(set_a & set_b) / len(set_a | set_b)

    def breakdown(
        self, episode_a: Episode, episode_b: Episode
    ) -> dict[str, float]:
        return {
            "event": self._event_similarity(episode_a, episode_b),
            "entity": self._set_similarity(
                set(episode_a.entities), set(episode_b.entities)
            ),
            "sector": self._set_similarity(
                set(episode_a.sectors), set(episode_b.sectors)
            ),
            "location": self._set_similarity(
                set(episode_a.locations), set(episode_b.locations)
            ),
            "market": self._market_similarity(episode_a, episode_b),
            "timeline": self._timeline_similarity(episode_a, episode_b),
            "graph": self._graph_similarity(episode_a, episode_b),
        }

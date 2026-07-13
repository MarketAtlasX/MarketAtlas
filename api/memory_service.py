"""
Memory Service - Central intelligence layer for MarketAtlas.

This service provides a unified interface for:
- Episode Retrieval (semantic + metadata search)
- Similarity Search (weighted multi-dimensional)
- Outcome Tracking
- Lesson Generation
- Timeline Reconstruction
- Confidence Estimation
- Memory Consolidation
"""

from datetime import datetime
from typing import Any, Optional

from config import settings


class MemoryService:
    def __init__(self):
        from episodic_memory.models import (
            Episode, Outcome, OutcomeCategory, OutcomeSeverity,
            Timeline, TimelineEvent,
        )
        from episodic_memory.builders import EpisodeBuilder, TimelineBuilder, LessonBuilder
        from episodic_memory.retrievers import SimilarityRetriever, AnalogSearch
        from episodic_memory.storage import PostgresStore, QdrantStore, Neo4jStore
        from evolution import EpisodeUpdater, EpisodeMerger, Consolidator
        from embeddings import EmbeddingGenerator
        from similarity import CosineSimilarity, WeightedSimilarity
        from retrieval import EpisodeRetrieval, HybridRetriever
        from outcomes import OutcomeTracker, OutcomeAnalyzer
        from lessons import LessonEngine, LessonTemplates
        from storage import StorageFactory
        from indexing import EventClusterer, Deduplicator
        from semantic_memory import SemanticStore, SemanticExtractor
        from procedural_memory import ProceduralStore, ProcedureExtractor

        self._Episode = Episode
        self._Outcome = Outcome
        self._OutcomeCategory = OutcomeCategory
        self._OutcomeSeverity = OutcomeSeverity
        self._Timeline = Timeline
        self._TimelineEvent = TimelineEvent

        self.postgres: PostgresStore = StorageFactory.create_postgres()
        self.qdrant: QdrantStore = StorageFactory.create_qdrant(
            vector_size=settings.embedding_dim
        )
        self.neo4j: Neo4jStore = StorageFactory.create_neo4j()

        self.embedding_generator = EmbeddingGenerator()
        self.cosine_similarity = CosineSimilarity()
        self.weighted_similarity = WeightedSimilarity()

        self.episode_builder = EpisodeBuilder()
        self.timeline_builder = TimelineBuilder()
        self.lesson_builder = LessonBuilder()
        self.episode_updater = EpisodeUpdater()
        self.episode_merger = EpisodeMerger()
        self.consolidator = Consolidator()
        self.event_clusterer = EventClusterer()
        self.deduplicator = Deduplicator()

        self.episode_retrieval = EpisodeRetrieval(
            postgres=self.postgres,
            qdrant=self.qdrant,
            embedding_generator=self.embedding_generator,
        )
        self.hybrid_retriever = HybridRetriever(
            postgres=self.postgres,
            qdrant=self.qdrant,
            neo4j=self.neo4j,
            embedding_generator=self.embedding_generator,
            similarity=self.weighted_similarity,
        )
        self.similarity_retriever = SimilarityRetriever(
            postgres=self.postgres,
            qdrant=self.qdrant,
            embedding_generator=self.embedding_generator,
            weighted_similarity=self.weighted_similarity,
        )
        self.analog_search = AnalogSearch(
            postgres=self.postgres,
            qdrant=self.qdrant,
            neo4j=self.neo4j,
            embedding_generator=self.embedding_generator,
            weighted_similarity=self.weighted_similarity,
        )

        self.outcome_tracker = OutcomeTracker()
        self.outcome_analyzer = OutcomeAnalyzer()
        self.lesson_engine = LessonEngine()
        self.lesson_templates = LessonTemplates()

        self.semantic_store = SemanticStore()
        self.semantic_extractor = SemanticExtractor()
        self.procedural_store = ProceduralStore()
        self.procedure_extractor = ProcedureExtractor()

    async def list_recent(self, limit: int = 20, offset: int = 0):
        return await self.postgres.list_recent(limit=limit, offset=offset)

    async def initialize(self):
        await self.postgres.initialize()
        self.qdrant.initialize()
        await self.neo4j.initialize()

    async def close(self):
        await self.postgres.close()
        await self.neo4j.close()

    # --- Episode Lifecycle ---

    async def create_episode(
        self,
        articles: list[dict],
        cluster_id: Optional[str] = None,
    ):
        embeddings = self.embedding_generator.encode_batch(
            [a.get("title", "") + " " + a.get("summary", "") for a in articles]
        )

        unique_articles, unique_embs, _ = self.deduplicator.deduplicate(
            articles, embeddings
        )

        clusters = self.event_clusterer.cluster(unique_articles, unique_embs)

        best_cluster = max(clusters.values(), key=len)
        cluster_articles = [unique_articles[i] for i in best_cluster]

        episode = self.episode_builder.build(
            cluster_articles, cluster_id=cluster_id
        )

        episode.embeddings = self.embedding_generator.encode_episode(episode)

        await self.postgres.store_episode(episode)
        self.qdrant.store_embedding(episode.id, episode.embeddings)
        await self.neo4j.store_episode(episode)

        return episode

    async def get_episode(self, episode_id: str):
        return await self.postgres.get_episode(episode_id)

    async def update_episode(
        self, episode_id: str, new_articles: list[dict]
    ):
        episode = await self.postgres.get_episode(episode_id)
        if not episode:
            return None

        episode = self.episode_updater.update_with_articles(
            episode, new_articles
        )
        episode.embeddings = self.embedding_generator.encode_episode(episode)

        await self.postgres.store_episode(episode)
        self.qdrant.store_embedding(episode.id, episode.embeddings)
        await self.neo4j.store_episode(episode)

        return episode

    async def delete_episode(self, episode_id: str) -> bool:
        self.qdrant.delete_embedding(episode_id)
        return await self.postgres.delete_episode(episode_id)

    # --- Search & Retrieval ---

    async def search(
        self,
        query: str,
        top_k: int = 10,
        filters: Optional[dict] = None,
    ):
        return await self.episode_retrieval.search(
            query=query,
            top_k=top_k,
            metadata_filters=filters,
        )

    async def hybrid_search(
        self,
        query: str,
        top_k: int = 10,
    ):
        return await self.hybrid_retriever.search(query=query, top_k=top_k)

    async def find_similar(
        self,
        episode_id: str,
        top_k: int = 5,
    ):
        episode = await self.postgres.get_episode(episode_id)
        if not episode:
            return []
        return await self.similarity_retriever.find_similar(
            episode, top_k=top_k
        )

    async def find_analogous(
        self, episode_id: str, top_k: int = 5
    ):
        episode = await self.postgres.get_episode(episode_id)
        if not episode:
            return []
        return await self.analog_search.find_analogous(episode, top_k=top_k)

    async def search_by_metadata(
        self,
        locations: list[str] | None = None,
        sectors: list[str] | None = None,
        entities: list[str] | None = None,
        participants: list[str] | None = None,
        tags: list[str] | None = None,
        limit: int = 50,
    ):
        return await self.episode_retrieval.search_by_metadata(
            locations=locations,
            sectors=sectors,
            entities=entities,
            participants=participants,
            tags=tags,
            limit=limit,
        )

    # --- Outcomes ---

    async def record_outcome(
        self,
        episode_id: str,
        category: str,
        metric: str,
        value: float,
        unit: str = "",
        direction: str = "neutral",
    ):
        episode = await self.postgres.get_episode(episode_id)
        if not episode:
            return None

        outcome = self.outcome_tracker.record_outcome(
            episode=episode,
            category=self._OutcomeCategory(category),
            metric=metric,
            value=value,
            unit=unit,
            direction=direction,
        )

        episode.embeddings = self.embedding_generator.encode_episode(episode)

        await self.postgres.store_episode(episode)
        self.qdrant.store_embedding(episode.id, episode.embeddings)
        return outcome

    async def get_outcomes(self, episode_id: str):
        episode = await self.postgres.get_episode(episode_id)
        if not episode:
            return None
        return self.outcome_tracker.summary(episode)

    async def analyze_outcomes(self, episode_ids: list[str]):
        episodes = []
        for eid in episode_ids:
            ep = await self.postgres.get_episode(eid)
            if ep:
                episodes.append(ep)
        return {
            "by_category": self.outcome_analyzer.aggregate_by_category(episodes),
            "sector_impact": self.outcome_analyzer.sector_impact_summary(episodes),
        }

    # --- Lessons ---

    async def generate_lessons(self, episode_id: str):
        episode = await self.postgres.get_episode(episode_id)
        if not episode:
            return None
        lessons = self.lesson_engine.generate(episode)
        for lesson in lessons:
            episode.add_lesson(lesson)
        await self.postgres.store_episode(episode)
        return lessons

    async def get_lessons(self, episode_id: str):
        episode = await self.postgres.get_episode(episode_id)
        if not episode:
            return None
        return episode.lessons

    # --- Consolidation ---

    async def consolidate(self, episode_ids: list[str]):
        episodes = []
        for eid in episode_ids:
            ep = await self.postgres.get_episode(eid)
            if ep:
                episodes.append(ep)

        if not episodes:
            return None

        merged = self.episode_merger.merge(episodes)
        merged.embeddings = self.embedding_generator.encode_episode(merged)

        await self.postgres.store_episode(merged)
        self.qdrant.store_embedding(merged.id, merged.embeddings)
        await self.neo4j.store_episode(merged)

        return merged

    async def auto_consolidate(self, limit: int = 100):
        episodes = await self.postgres.list_recent(limit=limit)
        consolidated = self.consolidator.consolidate(episodes)

        meta_episodes = [e for e in consolidated if e.is_meta]
        for meta in meta_episodes:
            await self.postgres.store_episode(meta)
            if meta.embeddings:
                self.qdrant.store_embedding(meta.id, meta.embeddings)
            await self.neo4j.store_episode(meta)

        return meta_episodes

    # --- Semantic Memory ---

    def extract_facts(self, episode):
        text = episode.to_embedding_text()
        facts = self.semantic_extractor.extract(
            text, source_episode_id=episode.id
        )
        self.semantic_store.store_facts(facts)
        return facts

    def query_facts(
        self,
        subject: Optional[str] = None,
        predicate: Optional[str] = None,
        object: Optional[str] = None,
    ):
        return self.semantic_store.query(
            subject=subject, predicate=predicate, object=object
        )

    # --- Procedural Memory ---

    def get_procedures(self, category: Optional[str] = None):
        if category:
            return self.procedural_store.find_by_category(category)
        return self.procedural_store.get_all()

    # --- Timeline ---

    async def get_timeline(self, episode_id: str):
        episode = await self.postgres.get_episode(episode_id)
        if not episode:
            return None
        return {
            "episode_id": episode.id,
            "title": episode.title,
            "duration_days": episode.timeline.duration_days(),
            "event_count": len(episode.timeline.events),
            "events": [
                {
                    "date": e.date.isoformat(),
                    "title": e.title,
                    "event_type": e.event_type,
                    "description": e.description[:200],
                }
                for e in episode.timeline.events
            ],
        }

    # --- Confidence ---

    async def estimate_confidence(self, episode_id: str):
        episode = await self.postgres.get_episode(episode_id)
        if not episode:
            return None
        score = episode.confidence
        if episode.source_count > 0:
            score = min(1.0, score + 0.1 * min(1.0, episode.source_count / 20.0))
        if episode.outcomes:
            score = min(1.0, score + 0.1)
        if episode.lessons:
            score = min(1.0, score + 0.05)
        return score

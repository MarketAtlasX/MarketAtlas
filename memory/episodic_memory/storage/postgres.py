import json
from datetime import datetime
from typing import Optional


class PostgresStore:
    def __init__(self, dsn: Optional[str] = None):
        from config import settings

        self.dsn = dsn or settings.postgres_dsn
        self._engine = None
        self._session_factory = None

    async def initialize(self):
        from sqlalchemy import Column, String, Float, DateTime, Text, Integer, JSON, Boolean
        from sqlalchemy import select, delete, and_
        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
        from sqlalchemy.orm import DeclarativeBase

        class Base(DeclarativeBase):
            pass

        class EpisodeRecord(Base):
            __tablename__ = "episodes"

            id = Column(String(64), primary_key=True)
            title = Column(String(300), nullable=False)
            summary = Column(Text, default="")
            participants = Column(JSON, default=list)
            locations = Column(JSON, default=list)
            entities = Column(JSON, default=list)
            commodities = Column(JSON, default=list)
            sectors = Column(JSON, default=list)
            market_reaction = Column(JSON, default=dict)
            confidence = Column(Float, default=0.0)
            outcomes = Column(JSON, default=list)
            lessons = Column(JSON, default=list)
            references = Column(JSON, default=list)
            tags = Column(JSON, default=list)
            cluster_id = Column(String(64), nullable=True)
            parent_episode_id = Column(String(64), nullable=True)
            child_episode_ids = Column(JSON, default=list)
            source_count = Column(Integer, default=0)
            is_meta = Column(Boolean, default=False)
            timeline_events = Column(JSON, default=list)
            world_state_before = Column(JSON, default=dict)
            world_state_after = Column(JSON, default=dict)
            created_at = Column(DateTime, default=datetime.utcnow)
            updated_at = Column(DateTime, default=datetime.utcnow)

        self._Base = Base
        self._EpisodeRecord = EpisodeRecord

        self._engine = create_async_engine(self.dsn, echo=False)
        self._session_factory = async_sessionmaker(
            self._engine, class_=AsyncSession, expire_on_commit=False
        )
        async with self._engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def close(self):
        if self._engine:
            await self._engine.dispose()

    async def store_episode(self, episode) -> None:
        from sqlalchemy import select

        record = self._to_record(episode)
        async with self._session_factory() as session:
            async with session.begin():
                await session.merge(record)

    async def get_episode(self, episode_id: str):
        from sqlalchemy import select

        async with self._session_factory() as session:
            result = await session.execute(
                select(self._EpisodeRecord).where(self._EpisodeRecord.id == episode_id)
            )
            record = result.scalar_one_or_none()
            return self._from_record(record) if record else None

    async def delete_episode(self, episode_id: str) -> bool:
        from sqlalchemy import delete

        async with self._session_factory() as session:
            async with session.begin():
                result = await session.execute(
                    delete(self._EpisodeRecord).where(self._EpisodeRecord.id == episode_id)
                )
                return result.rowcount > 0

    async def search_by_metadata(
        self,
        locations: list[str] | None = None,
        sectors: list[str] | None = None,
        entities: list[str] | None = None,
        participants: list[str] | None = None,
        tags: list[str] | None = None,
        min_confidence: float = 0.0,
        start_date=None,
        end_date=None,
        limit: int = 50,
        offset: int = 0,
    ):
        from sqlalchemy import select, and_
        import json

        conditions = []
        if locations:
            conditions.append(
                self._EpisodeRecord.locations.contains(json.dumps(locations))
            )
        if sectors:
            conditions.append(
                self._EpisodeRecord.sectors.contains(json.dumps(sectors))
            )
        if entities:
            conditions.append(
                self._EpisodeRecord.entities.contains(json.dumps(entities))
            )
        if participants:
            conditions.append(
                self._EpisodeRecord.participants.contains(json.dumps(participants))
            )
        if tags:
            conditions.append(
                self._EpisodeRecord.tags.contains(json.dumps(tags))
            )
        if min_confidence > 0:
            conditions.append(self._EpisodeRecord.confidence >= min_confidence)
        if start_date:
            conditions.append(self._EpisodeRecord.created_at >= start_date)
        if end_date:
            conditions.append(self._EpisodeRecord.created_at <= end_date)

        async with self._session_factory() as session:
            query = select(self._EpisodeRecord)
            if conditions:
                query = query.where(and_(*conditions))
            query = query.order_by(self._EpisodeRecord.updated_at.desc())
            query = query.limit(limit).offset(offset)
            result = await session.execute(query)
            return [self._from_record(r) for r in result.scalars().all()]

    async def list_recent(self, limit: int = 20, offset: int = 0):
        from sqlalchemy import select

        async with self._session_factory() as session:
            query = (
                select(self._EpisodeRecord)
                .order_by(self._EpisodeRecord.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
            result = await session.execute(query)
            return [self._from_record(r) for r in result.scalars().all()]

    def _to_record(self, episode):
        return self._EpisodeRecord(
            id=episode.id,
            title=episode.title,
            summary=episode.summary,
            participants=[p.model_dump() for p in episode.participants],
            locations=episode.locations,
            entities=episode.entities,
            commodities=episode.commodities,
            sectors=episode.sectors,
            market_reaction=episode.market_reaction,
            confidence=episode.confidence,
            outcomes=[o.model_dump() for o in episode.outcomes],
            lessons=episode.lessons,
            references=episode.references,
            tags=episode.tags,
            cluster_id=episode.cluster_id,
            parent_episode_id=episode.parent_episode_id,
            child_episode_ids=episode.child_episode_ids,
            source_count=episode.source_count,
            is_meta=episode.is_meta,
            timeline_events=[e.model_dump() for e in episode.timeline.events],
            world_state_before=episode.world_state_before,
            world_state_after=episode.world_state_after,
            created_at=episode.created_at,
            updated_at=episode.updated_at,
        )

    def _from_record(self, record):
        from episodic_memory.models import Episode, Participant, Outcome, Timeline, TimelineEvent

        participants = [
            Participant(**p) if isinstance(p, dict) else Participant(name=str(p))
            for p in (record.participants or [])
        ]
        outcomes = [Outcome(**o) for o in (record.outcomes or [])]
        events = [TimelineEvent(**e) for e in (record.timeline_events or [])]

        return Episode(
            id=record.id,
            title=record.title,
            summary=record.summary or "",
            timeline=Timeline(events=events),
            participants=participants,
            locations=record.locations or [],
            entities=record.entities or [],
            commodities=record.commodities or [],
            sectors=record.sectors or [],
            market_reaction=record.market_reaction or {},
            world_state_before=record.world_state_before or {},
            world_state_after=record.world_state_after or {},
            confidence=record.confidence or 0.0,
            outcomes=outcomes,
            lessons=record.lessons or [],
            references=record.references or [],
            tags=record.tags or [],
            cluster_id=record.cluster_id,
            parent_episode_id=record.parent_episode_id,
            child_episode_ids=record.child_episode_ids or [],
            source_count=record.source_count or 0,
            is_meta=record.is_meta or False,
            created_at=record.created_at or datetime.utcnow(),
            updated_at=record.updated_at or datetime.utcnow(),
        )

from typing import Optional


class Neo4jStore:
    def __init__(
        self,
        uri: Optional[str] = None,
        user: Optional[str] = None,
        password: Optional[str] = None,
    ):
        from config import settings

        self.uri = uri or settings.neo4j_uri
        self.user = user or settings.neo4j_user
        self.password = password or settings.neo4j_password
        self._driver = None

    async def initialize(self):
        from neo4j import AsyncGraphDatabase

        self._driver = AsyncGraphDatabase.driver(
            self.uri, auth=(self.user, self.password)
        )

    async def close(self):
        if self._driver:
            await self._driver.close()

    async def store_episode(self, episode) -> None:
        async with self._driver.session() as session:
            await session.run(
                """
                MERGE (e:Episode {id: $id})
                SET e.title = $title,
                    e.summary = $summary,
                    e.confidence = $confidence,
                    e.created_at = $created_at,
                    e.updated_at = $updated_at,
                    e.is_meta = $is_meta
                """,
                id=episode.id,
                title=episode.title,
                summary=episode.summary,
                confidence=episode.confidence,
                created_at=episode.created_at.isoformat(),
                updated_at=episode.updated_at.isoformat(),
                is_meta=episode.is_meta,
            )

            for loc in episode.locations:
                await session.run(
                    """
                    MATCH (e:Episode {id: $eid})
                    MERGE (l:Location {name: $name})
                    MERGE (e)-[:INVOLVES_LOCATION]->(l)
                    """,
                    eid=episode.id, name=loc,
                )

            for sector in episode.sectors:
                await session.run(
                    """
                    MATCH (e:Episode {id: $eid})
                    MERGE (s:Sector {name: $name})
                    MERGE (e)-[:AFFECTS_SECTOR]->(s)
                    """,
                    eid=episode.id, name=sector,
                )

            for commodity in episode.commodities:
                await session.run(
                    """
                    MATCH (e:Episode {id: $eid})
                    MERGE (c:Commodity {name: $name})
                    MERGE (e)-[:INVOLVES_COMMODITY]->(c)
                    """,
                    eid=episode.id, name=commodity,
                )

            for p in episode.participants:
                await session.run(
                    """
                    MATCH (e:Episode {id: $eid})
                    MERGE (p:Participant {name: $name})
                    SET p.role = $role, p.type = $type
                    MERGE (e)-[:INVOLVES_PARTICIPANT {role: $role}]->(p)
                    """,
                    eid=episode.id,
                    name=p.name,
                    role=p.role.value,
                    type=p.participant_type.value,
                )

            for event in episode.timeline.events:
                await session.run(
                    """
                    MATCH (e:Episode {id: $eid})
                    MERGE (ev:TimelineEvent {date: $date, title: $title})
                    SET ev.event_type = $event_type
                    MERGE (e)-[:HAS_EVENT]->(ev)
                    """,
                    eid=episode.id,
                    date=event.date.isoformat(),
                    title=event.title,
                    event_type=event.event_type,
                )

    async def get_related_episodes(self, episode_id: str, max_depth: int = 2) -> list[str]:
        async with self._driver.session() as session:
            result = await session.run(
                """
                MATCH (e:Episode {id: $eid})
                OPTIONAL MATCH path = (e)-[*1..$depth]-(related:Episode)
                WHERE related.id <> $eid
                RETURN DISTINCT related.id AS id
                LIMIT 50
                """,
                eid=episode_id,
                depth=max_depth,
            )
            return [record["id"] async for record in result]

    async def find_episodes_by_participant(self, participant_name: str) -> list[str]:
        async with self._driver.session() as session:
            result = await session.run(
                """
                MATCH (p:Participant {name: $name})<-[:INVOLVES_PARTICIPANT]-(e:Episode)
                RETURN e.id AS id
                ORDER BY e.created_at DESC
                """,
                name=participant_name,
            )
            return [record["id"] async for record in result]

    async def find_episodes_by_location(self, location: str) -> list[str]:
        async with self._driver.session() as session:
            result = await session.run(
                """
                MATCH (l:Location {name: $name})<-[:INVOLVES_LOCATION]-(e:Episode)
                RETURN e.id AS id
                ORDER BY e.created_at DESC
                """,
                name=location,
            )
            return [record["id"] async for record in result]

    async def find_episodes_by_sector(self, sector: str) -> list[str]:
        async with self._driver.session() as session:
            result = await session.run(
                """
                MATCH (s:Sector {name: $name})<-[:AFFECTS_SECTOR]-(e:Episode)
                RETURN e.id AS id
                ORDER BY e.created_at DESC
                """,
                name=sector,
            )
            return [record["id"] async for record in result]

    async def find_episodes_by_commodity(self, commodity: str) -> list[str]:
        async with self._driver.session() as session:
            result = await session.run(
                """
                MATCH (c:Commodity {name: $name})<-[:INVOLVES_COMMODITY]-(e:Episode)
                RETURN e.id AS id
                ORDER BY e.created_at DESC
                """,
                name=commodity,
            )
            return [record["id"] async for record in result]

from config import settings
from episodic_memory.storage import PostgresStore, QdrantStore, Neo4jStore


class StorageFactory:
    @staticmethod
    def create_postgres(dsn: str | None = None) -> PostgresStore:
        return PostgresStore(dsn=dsn or settings.postgres_dsn)

    @staticmethod
    def create_qdrant(
        url: str | None = None,
        collection: str | None = None,
        vector_size: int = 384,
    ) -> QdrantStore:
        return QdrantStore(
            url=url or settings.qdrant_url,
            collection=collection or settings.qdrant_collection,
            vector_size=vector_size,
        )

    @staticmethod
    def create_neo4j(
        uri: str | None = None,
        user: str | None = None,
        password: str | None = None,
    ) -> Neo4jStore:
        return Neo4jStore(
            uri=uri or settings.neo4j_uri,
            user=user or settings.neo4j_user,
            password=password or settings.neo4j_password,
        )

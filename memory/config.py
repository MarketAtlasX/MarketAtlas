from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    project_name: str = "MarketAtlas Memory"
    version: str = "0.1.0"
    debug: bool = True

    postgres_dsn: str = "postgresql+asyncpg://user:pass@localhost:5432/marketatlas"
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "episode_embeddings"
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "password"
    s3_bucket: str = "marketatlas-memory"
    s3_endpoint: Optional[str] = None

    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dim: int = 384

    redis_url: str = "redis://localhost:6379/0"

    api_host: str = "0.0.0.0"
    api_port: int = 8010

    class Config:
        env_prefix = "MATLAS_"
        env_file = ".env"


settings = Settings()

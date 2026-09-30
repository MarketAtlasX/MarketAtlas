"""Configuration schema and defaults for MarketAtlas backend."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class DatabaseConfig:
    url: str = 'sqlite:///./marketatlas.db'
    pool_size: int = 5
    max_overflow: int = 10
    echo: bool = False


@dataclass
class CacheConfig:
    backend: str = 'memory'
    redis_url: Optional[str] = None
    default_ttl: int = 300


@dataclass
class PredictionConfig:
    timeout_seconds: int = 60
    max_retries: int = 2
    enable_caching: bool = True
    model_name: str = 'gpt-4o'


@dataclass
class AppConfig:
    debug: bool = False
    environment: str = 'development'
    api_prefix: str = '/api'
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    cache: CacheConfig = field(default_factory=CacheConfig)
    prediction: PredictionConfig = field(default_factory=PredictionConfig)
    cors_origins: List[str] = field(default_factory=lambda: ['http://localhost:5173'])

    @classmethod
    def from_env(cls) -> 'AppConfig':
        """Load configuration from environment variables."""
        return cls(
            debug=os.getenv('DEBUG', 'false').lower() == 'true',
            environment=os.getenv('ENVIRONMENT', 'development'),
            database=DatabaseConfig(url=os.getenv('DATABASE_URL', 'sqlite:///./marketatlas.db')),
            cache=CacheConfig(backend=os.getenv('CACHE_BACKEND', 'memory'), redis_url=os.getenv('REDIS_URL')),
        )

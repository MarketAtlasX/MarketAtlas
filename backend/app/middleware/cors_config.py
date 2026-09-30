"""CORS configuration for MarketAtlas API."""
from __future__ import annotations

from typing import List

ALLOWED_ORIGINS: List[str] = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
]

CORS_CONFIG = {
    'allow_origins': ALLOWED_ORIGINS,
    'allow_credentials': True,
    'allow_methods': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    'allow_headers': ['*'],
    'max_age': 600,
}


def get_cors_origins(environment: str = 'development') -> List[str]:
    """Get CORS allowed origins based on environment."""
    if environment == 'production':
        return ['https://marketatlas.app', 'https://www.marketatlas.app']
    return ALLOWED_ORIGINS

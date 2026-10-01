"""Centralized error handling utilities for MarketAtlas API."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class MarketAtlasError(Exception):
    """Base exception for MarketAtlas application errors."""

    def __init__(self, message: str, code: str = 'UNKNOWN_ERROR', details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.code = code
        self.error_code = code
        self.status_code = 500
        self.details = details or {}


class ResourceNotFoundError(MarketAtlasError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 'RESOURCE_NOT_FOUND', details)
        self.status_code = 404


class ValidationError(MarketAtlasError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 'VALIDATION_ERROR', details)
        self.status_code = 422


class RateLimitExceededError(MarketAtlasError):
    def __init__(self, message: str = 'Rate limit exceeded', details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 'RATE_LIMIT_EXCEEDED', details)
        self.status_code = 429


class UpstreamServiceError(MarketAtlasError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 'UPSTREAM_SERVICE_ERROR', details)
        self.status_code = 502


def format_error_response(error: MarketAtlasError) -> Dict[str, Any]:
    return {
        'error': {
            'code': error.error_code,
            'message': str(error),
            'details': error.details,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }
    }


class TickerNotFoundError(MarketAtlasError):
    """Raised when a ticker symbol cannot be resolved."""

    def __init__(self, ticker: str):
        super().__init__(
            message=f"Ticker '{ticker}' not found or unavailable",
            code='TICKER_NOT_FOUND',
            details={'ticker': ticker},
        )


class DataProviderError(MarketAtlasError):
    """Raised when an external data provider fails."""

    def __init__(self, provider: str, reason: str = ''):
        super().__init__(
            message=f"Data provider '{provider}' unavailable: {reason}",
            code='PROVIDER_ERROR',
            details={'provider': provider, 'reason': reason},
        )


class PredictionServiceError(MarketAtlasError):
    """Raised when the prediction pipeline fails."""

    def __init__(self, target: str, reason: str = ''):
        super().__init__(
            message=f"Prediction for '{target}' failed: {reason}",
            code='PREDICTION_FAILED',
            details={'target': target, 'reason': reason},
        )


class CausalGraphError(MarketAtlasError):
    """Raised when causal graph construction fails."""

    def __init__(self, ticker: str, reason: str = ''):
        super().__init__(
            message=f"Causal graph for '{ticker}' unavailable: {reason}",
            code='CAUSAL_GRAPH_ERROR',
            details={'ticker': ticker, 'reason': reason},
        )


def log_and_raise(error: MarketAtlasError) -> None:
    """Log an error at warning level and re-raise it."""
    logger.warning('%s [%s]: %s', error.code, type(error).__name__, str(error))
    raise error

"""Centralized error handling utilities for MarketAtlas API."""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class MarketAtlasError(Exception):
    """Base exception for MarketAtlas application errors."""

    def __init__(self, message: str, code: str = 'UNKNOWN_ERROR', details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.code = code
        self.details = details or {}


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

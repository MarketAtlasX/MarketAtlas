"""Ticker symbol validation and normalization utilities."""
from __future__ import annotations

import re
from typing import Optional

TICKER_PATTERN = re.compile(r'^[A-Z][A-Z0-9.\-]{0,9}$')
EXCHANGE_SUFFIXES = {'.L', '.TO', '.HK', '.SS', '.SZ', '.T', '.AX', '.NS', '.BO'}


def normalize_ticker(raw: str) -> str:
    """Normalize a ticker symbol to uppercase with whitespace stripped."""
    return raw.strip().upper()


def is_valid_ticker(ticker: str) -> bool:
    """Check if a string is a valid ticker symbol format."""
    cleaned = normalize_ticker(ticker)
    return bool(TICKER_PATTERN.match(cleaned))


def extract_base_ticker(ticker: str) -> str:
    """Extract the base ticker without exchange suffix."""
    normalized = normalize_ticker(ticker)
    for suffix in EXCHANGE_SUFFIXES:
        if normalized.endswith(suffix):
            return normalized[: -len(suffix)]
    return normalized


def sanitize_ticker_input(raw: str) -> Optional[str]:
    """Sanitize user input into a valid ticker or return None."""
    cleaned = normalize_ticker(raw)
    cleaned = re.sub(r'[^A-Z0-9.\-]', '', cleaned)
    if not cleaned or len(cleaned) > 10:
        return None
    return cleaned if is_valid_ticker(cleaned) else None

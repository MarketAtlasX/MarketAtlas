"""Seed market symbol data for offline/fallback operation."""
from __future__ import annotations

from typing import Dict, List, NamedTuple


class SymbolInfo(NamedTuple):
    """Basic information about a market symbol."""
    ticker: str
    name: str
    sector: str
    exchange: str
    currency: str


SEED_SYMBOLS: Dict[str, SymbolInfo] = {
    'NVDA': SymbolInfo('NVDA', 'NVIDIA Corporation', 'Semiconductors', 'NASDAQ', 'USD'),
    'TSMC': SymbolInfo('TSMC', 'Taiwan Semiconductor Manufacturing', 'Semiconductors', 'NYSE', 'USD'),
    'XOM': SymbolInfo('XOM', 'Exxon Mobil Corporation', 'Energy', 'NYSE', 'USD'),
    'SHEL': SymbolInfo('SHEL', 'Shell plc', 'Energy', 'NYSE', 'USD'),
    'AAPL': SymbolInfo('AAPL', 'Apple Inc.', 'Technology', 'NASDAQ', 'USD'),
    'GC': SymbolInfo('GC', 'Gold Futures', 'Commodities', 'COMEX', 'USD'),
    'MSFT': SymbolInfo('MSFT', 'Microsoft Corporation', 'Technology', 'NASDAQ', 'USD'),
    'AMZN': SymbolInfo('AMZN', 'Amazon.com Inc.', 'Technology', 'NASDAQ', 'USD'),
    'GOOGL': SymbolInfo('GOOGL', 'Alphabet Inc.', 'Technology', 'NASDAQ', 'USD'),
    'META': SymbolInfo('META', 'Meta Platforms Inc.', 'Technology', 'NASDAQ', 'USD'),
    'TSLA': SymbolInfo('TSLA', 'Tesla Inc.', 'Automotive', 'NASDAQ', 'USD'),
    'JPM': SymbolInfo('JPM', 'JPMorgan Chase & Co.', 'Financials', 'NYSE', 'USD'),
    'BAC': SymbolInfo('BAC', 'Bank of America Corp.', 'Financials', 'NYSE', 'USD'),
    'LMT': SymbolInfo('LMT', 'Lockheed Martin Corporation', 'Defense', 'NYSE', 'USD'),
}


def get_symbol_info(ticker: str) -> SymbolInfo | None:
    """Look up symbol info from seed data."""
    return SEED_SYMBOLS.get(ticker.upper().strip())


def list_sectors() -> List[str]:
    """Return unique sectors from seed symbols."""
    return sorted(set(s.sector for s in SEED_SYMBOLS.values()))

"""Explicit, reviewed asset → entity mappings for watchlist resolution.

Keyword matching is fragile: ``'GC'`` appears inside unrelated words and a
substring match on ``'GO'`` would wrongly hit ``'GOOGL'``. This module encodes
deliberate aliases used **only to locate an existing entity record** — it never
asserts, confirms, or upgrades a causal relationship.

Currencies deliberately carry no entity aliases: ``EntityType`` has no currency
concept, so mapping a currency symbol onto e.g. a region would be a false
positive. Currency assets therefore fall through to candidate matching.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass(frozen=True)
class AssetEntityMapping:
    """A validated mapping from a canonical asset symbol to entity aliases."""

    ticker: str
    canonical_name: str
    asset_type: str
    # Exact entity names (case-insensitive) this asset may correspond to.
    entity_names: tuple[str, ...] = field(default_factory=tuple)
    # Extra exact ticker tokens accepted in addition to the canonical symbol.
    alt_tickers: tuple[str, ...] = field(default_factory=tuple)


ASSET_ENTITY_MAPPINGS: tuple[AssetEntityMapping, ...] = (
    # ── Commodities ────────────────────────────────────────────────────
    AssetEntityMapping(
        "GC", "Gold", "commodity",
        entity_names=("Gold", "Gold Futures", "Gold Spot", "Gold Bullion"),
    ),
    AssetEntityMapping(
        "SI", "Silver", "commodity",
        entity_names=("Silver", "Silver Futures", "Silver Spot"),
    ),
    AssetEntityMapping(
        "CL", "Crude Oil (WTI)", "commodity",
        entity_names=("Crude Oil", "WTI Crude Oil", "West Texas Intermediate", "Oil"),
        alt_tickers=("USO",),
    ),
    AssetEntityMapping(
        "NG", "Natural Gas", "commodity",
        entity_names=("Natural Gas", "Natural Gas Futures"),
    ),
    AssetEntityMapping(
        "HG", "Copper", "commodity",
        entity_names=("Copper", "Copper Futures"),
    ),
    # ── Indices ────────────────────────────────────────────────────────
    AssetEntityMapping(
        "SPX", "S&P 500", "index",
        entity_names=("S&P 500", "S&P 500 Index", "SP500", "Standard & Poor's 500"),
        alt_tickers=("^GSPC", "SPY"),
    ),
    AssetEntityMapping(
        "NDX", "Nasdaq 100", "index",
        entity_names=("Nasdaq 100", "Nasdaq-100", "NDX Index"),
        alt_tickers=("^NDX", "QQQ"),
    ),
    AssetEntityMapping(
        "DJI", "Dow Jones Industrial Average", "index",
        entity_names=("Dow Jones Industrial Average", "Dow Jones", "DJIA"),
        alt_tickers=("^DJI", "DIA"),
    ),
    # ── Currencies (no entity aliases by design) ───────────────────────
    AssetEntityMapping("EURUSD", "Euro / US Dollar", "currency"),
    AssetEntityMapping("GBPUSD", "British Pound / US Dollar", "currency"),
    AssetEntityMapping("USDJPY", "US Dollar / Japanese Yen", "currency"),
    AssetEntityMapping("DXY", "US Dollar Index", "currency", alt_tickers=("DX-Y.NYB",)),
    # ── Common equity aliases ──────────────────────────────────────────
    AssetEntityMapping(
        "XOM", "Exxon Mobil", "stock",
        entity_names=("Exxon Mobil", "Exxon Mobil Corporation", "Exxon Mobil Corp"),
    ),
    AssetEntityMapping(
        "SHEL", "Shell", "stock",
        entity_names=("Shell", "Shell plc"),
    ),
    AssetEntityMapping(
        "NVDA", "NVIDIA", "stock",
        entity_names=("NVIDIA", "NVIDIA Corporation"),
    ),
    AssetEntityMapping(
        "TSM", "TSMC", "stock",
        entity_names=("TSMC", "Taiwan Semiconductor Manufacturing", "Taiwan Semiconductor"),
        alt_tickers=("TSM", "2330.TW"),
    ),
)

_BY_TICKER: dict[str, AssetEntityMapping] = {m.ticker.upper(): m for m in ASSET_ENTITY_MAPPINGS}


def get_asset_mapping(ticker: str) -> Optional[AssetEntityMapping]:
    """Return the reviewed mapping for a canonical symbol, if any."""
    if not ticker:
        return None
    return _BY_TICKER.get(ticker.strip().upper())


def mapping_ticker_tokens(mapping: AssetEntityMapping) -> set[str]:
    """Exact ticker tokens (canonical + aliases) for a mapping."""
    return {mapping.ticker.upper(), *(tok.upper() for tok in mapping.alt_tickers)}

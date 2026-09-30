"""Tests for seed symbols database and lookup helpers."""
from app.utils.seed_symbols import (
    SEED_SYMBOLS,
    get_seed_symbol,
    get_symbols_by_sector,
)


def test_seed_symbols_presence():
    assert "NVDA" in SEED_SYMBOLS
    assert "AAPL" in SEED_SYMBOLS
    assert "MSFT" in SEED_SYMBOLS


def test_get_seed_symbol():
    nvda = get_seed_symbol("nvda")
    assert nvda is not None
    assert nvda.name == "NVIDIA Corporation"
    assert nvda.sector == "Technology"


def test_get_symbols_by_sector():
    tech = get_symbols_by_sector("Technology")
    assert len(tech) >= 3
    assert any(s.ticker == "NVDA" for s in tech)

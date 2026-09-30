"""Tests for ticker symbol validation and normalization utilities."""
from app.utils.ticker_validation import (
    normalize_ticker,
    is_valid_ticker,
    extract_base_ticker,
    sanitize_ticker_input,
)


def test_normalize_ticker():
    assert normalize_ticker("nvda") == "NVDA"
    assert normalize_ticker("  aapl  ") == "AAPL"
    assert normalize_ticker("brk.b") == "BRK.B"


def test_is_valid_ticker():
    assert is_valid_ticker("NVDA") is True
    assert is_valid_ticker("AAPL") is True
    assert is_valid_ticker("BRK.A") is True
    assert is_valid_ticker("123INVALID") is False
    assert is_valid_ticker("") is False
    assert is_valid_ticker("A" * 15) is False


def test_extract_base_ticker():
    assert extract_base_ticker("BP.L") == "BP"
    assert extract_base_ticker("RY.TO") == "RY"
    assert extract_base_ticker("NVDA") == "NVDA"


def test_sanitize_ticker_input():
    assert sanitize_ticker_input("  msft  ") == "MSFT"
    assert sanitize_ticker_input("invalid ticker!!!") is None
    assert sanitize_ticker_input("") is None

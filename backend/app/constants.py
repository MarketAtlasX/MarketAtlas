"""Application-wide constants for MarketAtlas backend."""
from __future__ import annotations

API_VERSION = 'v1'
API_PREFIX = '/api'

CACHE_TTL_HEALTH = 30
CACHE_TTL_QUOTES = 300
CACHE_TTL_HISTORY = 900
CACHE_TTL_PREDICTION = 1800
CACHE_TTL_CAUSAL_GRAPH = 3600

DEFAULT_HISTORY_INTERVAL = 'daily'
MAX_HISTORY_ROWS = 365
SUPPORTED_INTERVALS = ('1min', '5min', '15min', '1h', 'daily', 'weekly', 'monthly')

DEFAULT_TIME_HORIZON = '30-day'
PREDICTION_TIMEOUT_SECONDS = 60
MAX_ALTERNATIVE_SCENARIOS = 4

MAX_TICKER_LENGTH = 10
MIN_TICKER_LENGTH = 1

ASSET_TYPES = ('equity', 'index', 'commodity', 'currency', 'crypto')

PROVIDER_YFINANCE = 'yfinance'
PROVIDER_ALPHA_VANTAGE = 'alpha_vantage'
PROVIDER_SIMULATED = 'simulated'

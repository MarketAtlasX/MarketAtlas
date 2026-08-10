"""One-shot fetch-and-cache for market and impact data.

Usage:
    python -m market_agents.ingest.cache

It reads API keys from `market_agents/.env` (KEY=VALUE lines), fetches data
from Alpha Vantage, FRED, and EIA (when keys provided), and writes JSON
files into `market_agents/ingest/cache/`.

If keys are missing, the script will skip live fetches and still write
fallback JSON so downstream agents can run deterministically.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Dict, Any

from .market_api import fetch_alpha_vantage_daily, fetch_fred_series
from .impact_api import fetch_eia_data

CACHE_DIR = Path(__file__).resolve().parent / "cache"
ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


def load_env_file(path: Path) -> Dict[str, str]:
    """Load a KEY=VALUE env file into a dict, skipping comments and blank lines."""
    env = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()
    return env


def ensure_cache_dir() -> None:
    """Create the cache directory if it does not exist."""
    CACHE_DIR.mkdir(exist_ok=True)


def save_json(obj: Any, filename: str) -> Path:
    """Serialize obj as JSON and write to the cache directory."""
    ensure_cache_dir()
    p = CACHE_DIR / filename
    with p.open("w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
    return p


def fetch_and_cache(alpha_symbols=None, fred_series=None, eia_series=None) -> dict:
    """Fetch data from all configured APIs and write JSON cache files."""
    if alpha_symbols is None:
        alpha_symbols = ["AAPL", "MSFT"]
    if fred_series is None:
        fred_series = ["UNRATE"]
    if eia_series is None:
        eia_series = ["TOTAL.STOCKS"]

    env = load_env_file(ENV_FILE)
    # export into os.environ for underlying helpers
    os.environ.update(env)

    results = {}

    for sym in alpha_symbols:
        print(f"Fetching Alpha Vantage for {sym}...")
        res = fetch_alpha_vantage_daily(sym, apikey=env.get("ALPHAVANTAGE_API_KEY"))
        p = save_json(res, f"alphavantage_{sym}.json")
        results[f"alphavantage_{sym}"] = str(p)

    for s in fred_series:
        print(f"Fetching FRED series {s}...")
        res = fetch_fred_series(s, apikey=env.get("FRED_API_KEY"))
        p = save_json(res, f"fred_{s}.json")
        results[f"fred_{s}"] = str(p)

    for s in eia_series:
        print(f"Fetching EIA series {s}...")
        res = fetch_eia_data(s)
        p = save_json(res, f"eia_{s}.json")
        results[f"eia_{s}"] = str(p)

    summary = {"cached_files": results}
    save_json(summary, "summary.json")
    print("Done. Cached files:")
    for k, v in results.items():
        print(f"  {k}: {v}")
    return summary


if __name__ == "__main__":
    fetch_and_cache()

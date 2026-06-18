import os
import requests
from typing import Dict, Any


def fetch_gdelt_events(query: str = "conflict") -> Dict[str, Any]:
    """Fetch recent GDELT doc/articles matching a query. Returns fallback on failure.

    GDELT APIs are public and generally do not require a key.
    """
    url = "https://api.gdeltproject.org/api/v2/doc/doc"
    params = {"query": query, "mode": "artlist", "format": "json"}
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        j = r.json()
        # return a small subset
        return {"query": query, "total": j.get("total", 0), "articles": j.get("articles", [])}
    except Exception:
        return {"query": query, "total": 0, "articles": []}


def fetch_acled_events() -> Dict[str, Any]:
    """Fetch ACLED events via the v2 API. Requires ACLED_EMAIL and ACLED_KEY env vars.

    Returns fallback on failure or if credentials are missing.
    """
    email = os.environ.get("ACLED_EMAIL")
    key = os.environ.get("ACLED_KEY")
    if not email or not key:
        return {"acled_reachable": False, "error": "ACLED_EMAIL/ACLED_KEY not set"}
    url = "https://api.acleddata.com/acled/read"
    params = {"email": email, "key": key, "limit": 50, "format": "json"}
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        j = r.json()
        return {"acled_reachable": True, "total": j.get("total", 0), "events": j.get("data", [])}
    except Exception:
        return {"acled_reachable": False}


def fetch_eia_data(series_id: str) -> Dict[str, Any]:
    """Fetch EIA series if `EIA_API_KEY` present; otherwise fallback.
    """
    apikey = os.environ.get("EIA_API_KEY")
    if not apikey:
        return {"series_id": series_id, "values": [0.0, 0.1]}
    url = "https://api.eia.gov/series/"
    params = {"api_key": apikey, "series_id": series_id}
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        j = r.json()
        data = j.get("series", [])[0]
        return {"series_id": series_id, "data": data}
    except Exception:
        return {"series_id": series_id, "values": [0.0, 0.1]}

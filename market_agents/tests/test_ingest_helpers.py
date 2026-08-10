from market_agents.ingest import impact_api, market_api


class _FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


def test_alpha_vantage_fallback_when_key_missing(monkeypatch):
    monkeypatch.delenv("ALPHAVANTAGE_API_KEY", raising=False)

    result = market_api.fetch_alpha_vantage_daily("AAPL")

    assert result["symbol"] == "AAPL"
    assert result["prices"] == [100.0, 101.0, 100.5, 102.0]


def test_alpha_vantage_parses_live_payload(monkeypatch):
    monkeypatch.setenv("ALPHAVANTAGE_API_KEY", "demo")
    monkeypatch.setattr(
        market_api.requests,
        "get",
        lambda *args, **kwargs: _FakeResponse(
            {
                "Time Series (Daily)": {
                    "2026-05-30": {"5. adjusted close": "100.0"},
                    "2026-05-31": {"5. adjusted close": "101.5"},
                }
            }
        ),
    )

    result = market_api.fetch_alpha_vantage_daily("AAPL")

    assert result["dates"] == ["2026-05-30", "2026-05-31"]
    assert result["prices"] == [100.0, 101.5]


def test_fred_fallback_when_key_missing(monkeypatch):
    monkeypatch.delenv("FRED_API_KEY", raising=False)

    result = market_api.fetch_fred_series("UNRATE")

    assert result["series_id"] == "UNRATE"
    assert result["values"] == [1.0, 1.1, 1.05]


def test_eia_parses_live_payload(monkeypatch):
    monkeypatch.setenv("EIA_API_KEY", "demo")
    monkeypatch.setattr(
        impact_api.requests,
        "get",
        lambda *args, **kwargs: _FakeResponse({"series": [{"series_id": "TOTAL.STOCKS", "data": [1, 2, 3]}]}),
    )

    result = impact_api.fetch_eia_data("TOTAL.STOCKS")

    assert result["series_id"] == "TOTAL.STOCKS"
    assert result["data"]["series_id"] == "TOTAL.STOCKS"
from market_agents.market_data.market_data_agent import MarketDataAgent
from market_agents.market_data import market_data_agent


def test_market_data_snapshot_and_statuses():
    agent = MarketDataAgent(
        prices=[100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114],
        volumes=[100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 160],
    )

    assert agent.momentum() > 0
    assert agent.rolling_volatility() >= 0
    assert agent.volume_status() == "surge"

    snapshot = agent.snapshot()
    assert set(snapshot) == {"momentum", "volatility", "volume"}
    assert snapshot["volume"] == "surge"


def test_market_data_volume_edge_cases():
    thin_agent = MarketDataAgent(prices=[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24], volumes=[100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 60])
    unknown_agent = MarketDataAgent(prices=[1, 2, 3])

    assert thin_agent.volume_status() == "thin"
    assert unknown_agent.volume_status() == "unknown"
    assert unknown_agent.momentum() == 0.0
    assert unknown_agent.rolling_volatility() == 0.0


def test_market_data_ingest_wrappers(monkeypatch):
    monkeypatch.setattr(
        market_data_agent,
        "fetch_alpha_vantage_daily",
        lambda symbol: {"symbol": symbol, "prices": [1.0, 2.0, 3.0]},
    )
    monkeypatch.setattr(
        market_data_agent,
        "fetch_fred_series",
        lambda series_id: {"series_id": series_id, "values": [4.0, 5.0]},
    )

    agent = MarketDataAgent(prices=[1, 2, 3])

    assert agent.ingest_from_alpha("AAPL")["symbol"] == "AAPL"
    assert agent.ingest_from_fred("UNRATE")["series_id"] == "UNRATE"
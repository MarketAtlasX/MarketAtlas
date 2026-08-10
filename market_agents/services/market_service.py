from __future__ import annotations

from market_agents.contracts import MarketSnapshot, MarketSnapshotRequest
from market_agents.market_data.market_data_agent import MarketDataAgent
from market_agents.observability import traced_path
from market_agents.services.common import create_service_app

SERVICE_NAME = "market-data-service"
app = create_service_app(SERVICE_NAME, "MarketAtlas Market Data Service")


@app.post("/snapshot", response_model=MarketSnapshot)
def snapshot(request: MarketSnapshotRequest):
    with traced_path(SERVICE_NAME, "market.snapshot"):
        agent = MarketDataAgent(request.prices, request.volumes)
        return MarketSnapshot(**agent.snapshot())

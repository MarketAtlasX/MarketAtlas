from __future__ import annotations

from market_agents.contracts import ImpactRequest, ImpactResponse
from market_agents.impact.impact_agent import ImpactAgent
from market_agents.observability import traced_path
from market_agents.services.common import create_service_app

SERVICE_NAME = "impact-service"
app = create_service_app(SERVICE_NAME, "MarketAtlas Impact Service")


@app.post("/impact", response_model=ImpactResponse)
def analyze_impact(request: ImpactRequest):
    with traced_path(SERVICE_NAME, "impact.pipeline"):
        agent = ImpactAgent()
        state = {"text": request.text}
        for step in (agent.ingest, agent.extract, agent.store, agent.propagate, agent.output):
            state = step(state)
        return ImpactResponse(
            local_severity=state["local_severity"],
            composite_risk=state["composite_risk"],
            graph_summary=state["graph_summary"],
            relations=[[a, rel, b] for a, rel, b in state["relations"]],
        )

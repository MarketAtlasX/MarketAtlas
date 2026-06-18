from fastapi import FastAPI, Body
from typing import Optional
from impact.impact_agent import ImpactAgent

app = FastAPI(title="impact-service")


@app.post("/ingest")
def ingest(payload: Optional[dict] = Body(None)):
    agent = ImpactAgent()
    state = payload or {"text": ""}
    state = agent.ingest(state)
    return {"status": "ingested", "state": state}


@app.post("/extract")
def extract(payload: Optional[dict] = Body(None)):
    agent = ImpactAgent()
    state = payload or {"text": ""}
    state = agent.extract(state)
    return {"entities": state.get("entities"), "relations": state.get("relations")}


@app.post("/process")
def process(payload: Optional[dict] = Body(None)):
    agent = ImpactAgent()
    state = payload or {"text": ""}
    state = agent.ingest(state)
    state = agent.extract(state)
    state = agent.store(state)
    state = agent.propagate(state)
    state = agent.output(state)
    return {"graph": state.get("graph_summary"), "relations": state.get("relations"), "local_severity": state.get("local_severity"), "composite_risk": state.get("composite_risk")}

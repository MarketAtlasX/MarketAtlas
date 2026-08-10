
from market_agents.impact.impact_agent import ImpactAgent


def test_neo4j_persistence_is_invoked(monkeypatch):
    # simulate neo4j configured
    monkeypatch.setenv("NEO4J_URI", "bolt://localhost:7687")

    called = {"v": False}

    # monkeypatch the impact module's persistence helper directly
    import market_agents.impact.impact_agent as ia

    monkeypatch.setattr(ia, "_persist_graph", lambda nodes, relations: called.__setitem__("v", True))

    ag = ImpactAgent()
    state = {"text": "X attacked Y."}
    state = ag.ingest(state)
    state = ag.extract(state)
    state = ag.store(state)
    state = ag.propagate(state)
    state = ag.output(state)

    assert called["v"] is True

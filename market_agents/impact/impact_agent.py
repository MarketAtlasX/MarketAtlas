from typing import Any, Dict

import networkx as nx

from ..ingest.impact_api import fetch_acled_events, fetch_eia_data, fetch_gdelt_events
from ..type_defs import GraphNodes, Relations, State


def _persist_graph(nodes: GraphNodes, relations: Relations) -> bool:
    """Best-effort persistence helper. Keeps persistence logic testable.

    Returns True if a write was attempted and succeeded, False otherwise.
    """
    try:
        # prefer absolute package import (works in most test/run contexts)
        try:
            from market_agents.persistence import neo4j_client
        except Exception:
            from ..persistence import neo4j_client
        import os

        if os.environ.get("NEO4J_URI"):
            try:
                return neo4j_client.write_graph(nodes, relations)
            except Exception:
                return False
    except Exception:
        return False
    return False


class ImpactAgent:
    """Impact analysis agent using an in-memory directed graph.

    This local implementation is rule-based and deterministic for an initial prototype.
    """

    def __init__(self) -> None:
        self.g = nx.DiGraph()

    def ingest(self, state: State) -> State:
        text = state.get("text", "")
        if not text or not isinstance(text, str):
            state["text"] = ""
            return state
        state["text"] = text
        # fetch a small set of external events for context (best-effort)
        state.setdefault("gdelt", fetch_gdelt_events())
        state.setdefault("acled", fetch_acled_events())
        state.setdefault("eia", fetch_eia_data("TOTAL.STOCKS"))
        return state

    def extract(self, state: State) -> State:
        text = state.get("text", "")
        if not text:
            state["entities"] = []
            state["relations"] = []
            return state
        entities = set()
        relations = []
        for part in text.split("."):
            part = part.strip()
            if not part:
                continue
            if "sanction" in part.lower():
                words = part.split()
                if len(words) >= 2:
                    entities.add(words[0])
                    entities.add(words[-1])
                    relations.append((words[0], "sanctioned", words[-1]))
            if "attack" in part.lower() or "strike" in part.lower():
                words = part.split()
                entities.add(words[0])
                entities.add(words[-1])
                relations.append((words[0], "attacked", words[-1]))
        if not entities:
            entities.add("doc")
        state["entities"] = list(entities)
        state["relations"] = relations
        return state

    def store(self, state: State) -> State:
        for e in state.get("entities", []):
            if e not in self.g:
                self.g.add_node(e, severity=0.0)
        for a, rel, b in state.get("relations", []):
            self.g.add_edge(a, b, relation=rel)
        text = state.get("text", "")
        risk_words = ["attack", "war", "sanction", "crisis", "collapse", "strike"]
        score = 0
        for w in risk_words:
            score += text.lower().count(w)
        local = min(1.0, score / 5.0)
        if "doc" in self.g.nodes:
            self.g.nodes["doc"]["severity"] = local
        else:
            for n in self.g.nodes:
                self.g.nodes[n]["severity"] = max(self.g.nodes[n].get("severity", 0.0), local)
        state["local_severity"] = local
        return state

    def propagate(self, state: State) -> State:
        if not self.g.nodes:
            state["composite_risk"] = 0.0
            return state
        decay = 0.5
        for node in list(self.g.nodes):
            base = self.g.nodes[node].get("severity", 0.0)
            propagated = base
            for source in self.g.predecessors(node):
                s = self.g.nodes[source].get("severity", 0.0)
                propagated = max(propagated, s * decay)
            self.g.nodes[node]["severity"] = propagated
        comp = 0.0
        for n in self.g.nodes:
            comp = max(comp, self.g.nodes[n].get("severity", 0.0))
        state["composite_risk"] = float(max(0.0, min(1.0, comp)))
        return state

    def output(self, state: State) -> State:
        if not self.g.nodes:
            state["graph_summary"] = {}
            state["relations"] = []
            return state
        state["graph_summary"] = {n: dict(self.g.nodes[n]) for n in self.g.nodes}
        # also capture relations for persistence / inspection
        relations = []
        for a, b in self.g.edges:
            rel = self.g.edges[a, b].get("relation")
            relations.append((a, rel or "related", b))
        state["relations"] = relations

        # attempt optional persistence if Neo4j configured (best-effort)
        try:
            _persist_graph(state["graph_summary"], relations)
        except Exception:
            pass

        return state

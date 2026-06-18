"""Simple Neo4j persistence helpers for MarketAtlas.

This module provides a lightweight write API used by `ImpactAgent` to
persist nodes and relations when a Neo4j endpoint is configured via
environment variables.
"""
from typing import Dict, Any, List, Tuple, Optional
import os

try:
    from neo4j import GraphDatabase
except Exception:  # pragma: no cover - driver optional in tests
    GraphDatabase = None


def _get_driver() -> Optional[object]:
    uri = os.environ.get("NEO4J_URI")
    user = os.environ.get("NEO4J_USER")
    password = os.environ.get("NEO4J_PASSWORD")
    if not uri or GraphDatabase is None:
        return None
    auth = (user, password) if user and password else None
    if auth:
        return GraphDatabase.driver(uri, auth=auth)
    return GraphDatabase.driver(uri)


def write_graph(nodes: Dict[str, Dict[str, Any]], relations: List[Tuple[str, str, str]], driver=None) -> bool:
    """Persist nodes and relations into Neo4j.

    - `nodes` is a mapping node_name -> properties
    - `relations` is a list of (source_name, relation, target_name)

    Returns True on success, False otherwise.
    """
    if driver is None:
        driver = _get_driver()
    if driver is None:
        return False

    def _tx_fn(tx, nodes, relations):
        # create/merge nodes
        for name, props in nodes.items():
            tx.run(
                "MERGE (n:Entity {name: $name}) SET n += $props",
                name=name,
                props=props or {},
            )
        # create relations
        for a, rel, b in relations:
            safe_rel = "".join(c for c in rel if c.isalnum() or c == "_")
            tx.run(
                "MERGE (a:Entity {name: $a}) MERGE (b:Entity {name: $b}) "
                f"MERGE (a)-[r:{safe_rel}]->(b)",
                a=a,
                b=b,
            )

    try:
        with driver.session() as session:
            session.write_transaction(_tx_fn, nodes, relations)
        return True
    except Exception:
        return False

"""Simple Neo4j persistence helpers for MarketAtlas.

This module provides a lightweight write API used by `ImpactAgent` to
persist nodes and relations when a Neo4j endpoint is configured via
environment variables.
"""
import logging
import os
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

try:
    from neo4j import GraphDatabase
    from neo4j.exceptions import Neo4jError, ServiceUnavailable
except ImportError:
    GraphDatabase = None
    Neo4jError = Exception
    ServiceUnavailable = Exception


def _get_driver() -> Optional[object]:
    uri = os.environ.get("NEO4J_URI")
    user = os.environ.get("NEO4J_USER")
    password = os.environ.get("NEO4J_PASSWORD")
    if not uri:
        logger.debug("NEO4J_URI not set; skipping Neo4j driver creation")
        return None
    if GraphDatabase is None:
        logger.warning("neo4j driver not installed; skipping persistence")
        return None
    auth = (user, password) if user and password else None
    try:
        if auth:
            return GraphDatabase.driver(uri, auth=auth)
        return GraphDatabase.driver(uri)
    except (Neo4jError, ServiceUnavailable) as exc:
        logger.error("Failed to create Neo4j driver: %s", exc)
        return None


def write_graph(nodes: Dict[str, Dict[str, Any]], relations: List[Tuple[str, str, str]], driver=None) -> bool:
    """Persist nodes and relations into Neo4j.

    - `nodes` is a mapping node_name -> properties
    - `relations` is a list of (source_name, relation, target_name)

    Returns True on success, False otherwise.
    """
    if driver is None:
        driver = _get_driver()
    if driver is None:
        logger.warning("No Neo4j driver available; skipping graph write")
        return False

    def _tx_fn(tx, nodes, relations):
        for name, props in nodes.items():
            tx.run(
                "MERGE (n:Entity {name: $name}) SET n += $props",
                name=name,
                props=props or {},
            )
        for a, rel, b in relations:
            safe_rel = "".join(c for c in rel if c.isalnum() or c == "_")
            if not safe_rel:
                logger.warning("Skipping relation with empty sanitized type: %s", rel)
                continue
            tx.run(
                "MERGE (a:Entity {name: $a}) MERGE (b:Entity {name: $b}) "
                f"MERGE (a)-[r:{safe_rel}]->(b)",
                a=a,
                b=b,
            )

    try:
        with driver.session() as session:
            session.write_transaction(_tx_fn, nodes, relations)
        logger.info("Successfully wrote %d nodes and %d relations to Neo4j", len(nodes), len(relations))
        return True
    except (Neo4jError, ServiceUnavailable) as exc:
        logger.error("Neo4j write transaction failed: %s", exc)
        return False

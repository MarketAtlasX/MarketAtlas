"""Type aliases used across the MarketAtlas codebase.

Centralising common type signatures helps keep agent and service
interfaces consistent and reduces import boilerplate.
"""
from typing import Any, Dict, List, Tuple

State = Dict[str, Any]
"""Pipeline state dictionary passed between agent stages."""

GraphNodes = Dict[str, Dict[str, Any]]
"""Mapping from entity name to its properties."""

Relations = List[Tuple[str, str, str]]
"""List of (source, relation_type, target) tuples."""

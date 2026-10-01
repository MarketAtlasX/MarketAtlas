"""
Graph package for the Geopolitical Knowledge Graph Intelligence Agent.

This package contains:
- state: TypedDict definitions for agent state
- workflow: LangGraph workflow orchestration
"""

from graph.state import AgentState, NewsArticle, Entity, GraphNode, GraphEdge

__all__ = [
    "AgentState",
    "NewsArticle",
    "Entity",
    "GraphNode",
    "GraphEdge",
    "compile_workflow",
    "create_workflow",
]


def __getattr__(name: str):
    if name in {"compile_workflow", "create_workflow"}:
        from graph.workflow import compile_workflow, create_workflow

        return {"compile_workflow": compile_workflow, "create_workflow": create_workflow}[name]
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Query

from graph_engine.builder.graph_builder import GraphBuilder
from graph_engine.models.graph_models import GraphEngineResponse
from graph_engine.layouts.layout_engine import LayoutEngine

router = APIRouter(prefix="/api/graph", tags=["graph"])
builder = GraphBuilder()
layout_engine = LayoutEngine()


@router.get("/health")
def health():
    return {"service": "graph_engine", "status": "ok", "version": "0.1.0"}


@router.get("/forecast")
def get_forecast_graph(
    symbol: str = Query("NVDA", description="Stock symbol"),
    company_name: str = Query("NVIDIA Corporation", description="Company name"),
    current_price: float = Query(880.0, description="Current stock price"),
    apply_layout: str = Query("", description="Optional layout: hierarchical, radial, force, tree"),
):
    try:
        result = builder.build_forecast_graph(symbol, company_name, current_price)
        graph = result.get("graph", {})
        if apply_layout:
            from graph_engine.models.graph_models import GraphData
            gd = GraphData(**graph)
            gd = layout_engine.apply_layout(gd, apply_layout)
            result["graph"] = gd.model_dump()
        return GraphEngineResponse(
            graph_type="forecast",
            data=result,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/causal")
def get_causal_graph(
    root_event: str = Query("Iran Conflict", description="Root event node"),
    target_asset: str = Query("NVIDIA", description="Target asset node"),
    max_paths: int = Query(5, ge=1, le=20, description="Maximum causal paths"),
    apply_layout: str = Query("hierarchical", description="Optional layout"),
):
    try:
        result = builder.build_causal_graph(root_event, target_asset, max_paths)
        if apply_layout and "combined_graph" in result:
            from graph_engine.models.graph_models import GraphData
            cg = result["combined_graph"]
            if isinstance(cg, dict):
                gd = GraphData(**cg)
                gd = layout_engine.apply_layout(gd, apply_layout)
                result["combined_graph"] = gd.model_dump()
        return GraphEngineResponse(
            graph_type="causal",
            data=result,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reasoning")
def get_reasoning_graph(
    target: str = Query("NVIDIA", description="Target asset for reasoning"),
    apply_layout: str = Query("hierarchical", description="Optional layout"),
):
    try:
        result = builder.build_reasoning_graph(target)
        if apply_layout and "graph" in result:
            from graph_engine.models.graph_models import GraphData
            rg = result["graph"]
            if isinstance(rg, dict):
                gd = GraphData(**rg)
                gd = layout_engine.apply_layout(gd, apply_layout)
                result["graph"] = gd.model_dump()
        return GraphEngineResponse(
            graph_type="reasoning",
            data=result,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/confidence")
def get_confidence_graph(
    target: str = Query("NVIDIA", description="Target asset for confidence"),
    prediction_value: Optional[float] = Query(None, description="Predicted price"),
    prediction_direction: str = Query("bullish", description="bullish/bearish/neutral"),
):
    try:
        result = builder.build_confidence_graph(target, prediction_value, prediction_direction)
        return GraphEngineResponse(
            graph_type="confidence",
            data=result,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/all")
def get_all_graphs(
    symbol: str = Query("NVDA", description="Stock symbol"),
    company_name: str = Query("NVIDIA Corporation", description="Company name"),
    current_price: float = Query(880.0, description="Current stock price"),
    root_event: str = Query("Iran Conflict", description="Root event"),
    target_asset: str = Query("NVIDIA", description="Target asset"),
):
    try:
        result = builder.build_all(symbol, company_name, current_price, root_event, target_asset)
        return GraphEngineResponse(
            graph_type="all",
            data=result,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

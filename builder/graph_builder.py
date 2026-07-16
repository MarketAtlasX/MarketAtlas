from __future__ import annotations

from typing import Any, Dict, Optional

from graph_engine.models.graph_models import (
    CausalGraph,
    ConfidenceGraph,
    ForecastGraph,
    GraphData,
    ReasoningGraph,
)
from graph_engine.builder.forecast_builder import ForecastGraphBuilder
from graph_engine.builder.causal_builder import CausalGraphBuilder
from graph_engine.builder.reasoning_builder import ReasoningGraphBuilder
from graph_engine.builder.confidence_builder import ConfidenceGraphBuilder


class GraphBuilder:
    def __init__(self):
        self.forecast = ForecastGraphBuilder()
        self.causal = CausalGraphBuilder()
        self.reasoning = ReasoningGraphBuilder()
        self.confidence = ConfidenceGraphBuilder()

    def build_forecast_graph(
        self,
        symbol: str,
        company_name: str,
        current_price: float,
        **kwargs,
    ) -> Dict[str, Any]:
        forecast = self.forecast.build(symbol, company_name, current_price, **kwargs)
        return {
            "forecast": forecast.model_dump(),
            "graph": self.forecast.to_graph_data(forecast).model_dump(),
        }

    def build_causal_graph(
        self,
        root_event: str,
        target_asset: str,
        max_paths: int = 5,
    ) -> Dict[str, Any]:
        result = self.causal.build_causal_graph(root_event, target_asset, max_paths)
        return result.model_dump()

    def build_reasoning_graph(
        self,
        target: str,
        agent_opinions: Optional[list] = None,
    ) -> Dict[str, Any]:
        result = self.reasoning.build(target, agent_opinions)
        return result.model_dump()

    def build_confidence_graph(
        self,
        target: str,
        prediction_value: Optional[float] = None,
        prediction_direction: str = "neutral",
    ) -> Dict[str, Any]:
        result = self.confidence.build(target, prediction_value, prediction_direction)
        return result.model_dump()

    def build_all(
        self,
        symbol: str,
        company_name: str,
        current_price: float,
        root_event: str = "Iran Conflict",
        target_asset: str = "NVIDIA",
    ) -> Dict[str, Any]:
        return {
            "forecast": self.build_forecast_graph(symbol, company_name, current_price),
            "causal": self.build_causal_graph(root_event, target_asset),
            "reasoning": self.build_reasoning_graph(target_asset),
            "confidence": self.build_confidence_graph(
                target_asset,
                prediction_value=current_price,
                prediction_direction="bullish",
            ),
        }

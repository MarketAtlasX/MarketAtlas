from __future__ import annotations

import math
import random
from datetime import datetime, timedelta
from typing import List, Optional

from graph_engine.models.graph_models import (
    ForecastGraph,
    ForecastPoint,
    GraphNode,
    GraphEdge,
    EdgeType,
    NodeType,
    GraphData,
    CausalPath,
    CausalGraph,
)


class ForecastGraphBuilder:
    def build(
        self,
        symbol: str,
        company_name: str,
        current_price: float,
        days_history: int = 60,
        days_forecast: int = 30,
        volatility: float = 0.02,
        trend: float = 0.001,
    ) -> ForecastGraph:
        now = datetime.utcnow()
        historical: List[ForecastPoint] = []
        predicted: List[ForecastPoint] = []

        price = current_price
        for i in range(days_history, 0, -1):
            day = now - timedelta(days=i)
            noise = random.gauss(0, volatility * price)
            price += noise
            historical.append(
                ForecastPoint(
                    day=-i,
                    date=day.strftime("%Y-%m-%d"),
                    value=round(price, 2),
                    upper=round(price * 1.02, 2),
                    lower=round(price * 0.98, 2),
                    confidence=0.3 + 0.7 * (i / days_history),
                )
            )

        for i in range(1, days_forecast + 1):
            day = now + timedelta(days=i)
            drift = price * trend
            noise = random.gauss(0, volatility * price * math.sqrt(i / 30))
            price += drift + noise
            conf_width = volatility * price * (1 + 0.5 * (i / days_forecast))
            confidence = max(0.1, 0.9 - 0.6 * (i / days_forecast))
            predicted.append(
                ForecastPoint(
                    day=i,
                    date=day.strftime("%Y-%m-%d"),
                    value=round(price, 2),
                    upper=round(price + conf_width * 1.96, 2),
                    lower=round(price - conf_width * 1.96, 2),
                    confidence=round(confidence, 3),
                )
            )

        return ForecastGraph(
            symbol=symbol,
            company_name=company_name,
            current_price=current_price,
            historical=historical,
            predicted=predicted,
        )

    def to_graph_data(self, forecast: ForecastGraph) -> GraphData:
        nodes: List[GraphNode] = []
        edges: List[GraphEdge] = []

        current_node = GraphNode(
            id=f"{forecast.symbol}_current",
            label=f"{forecast.symbol} ${forecast.current_price:.2f}",
            type=NodeType.forecast,
            value=forecast.current_price,
            metadata={"point_type": "current"},
        )
        nodes.append(current_node)

        prev_id = current_node.id
        for i, p in enumerate(forecast.historical[-10:]):
            node_id = f"{forecast.symbol}_hist_{i}"
            nodes.append(
                GraphNode(
                    id=node_id,
                    label=f"${p.value:.2f}",
                    type=NodeType.forecast,
                    value=p.value,
                    confidence=p.confidence,
                    metadata={"day": p.day, "date": p.date, "point_type": "historical"},
                )
            )
            edges.append(
                GraphEdge(
                    source=prev_id,
                    target=node_id,
                    label="",
                    type=EdgeType.leads_to,
                    weight=0.3,
                )
            )
            prev_id = node_id

        for i, p in enumerate(forecast.predicted[:15]):
            node_id = f"{forecast.symbol}_pred_{i}"
            nodes.append(
                GraphNode(
                    id=node_id,
                    label=f"${p.value:.2f}",
                    type=NodeType.forecast,
                    value=p.value,
                    confidence=p.confidence,
                    metadata={
                        "day": p.day,
                        "date": p.date,
                        "upper": p.upper,
                        "lower": p.lower,
                        "point_type": "predicted",
                    },
                )
            )
            edges.append(
                GraphEdge(
                    source=prev_id,
                    target=node_id,
                    label=f"+{p.day}d",
                    type=EdgeType.leads_to,
                    weight=p.confidence,
                    confidence=p.confidence,
                )
            )
            prev_id = node_id

        return GraphData(nodes=nodes, edges=edges)

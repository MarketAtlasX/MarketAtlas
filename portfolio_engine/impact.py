from __future__ import annotations

from typing import Any, Dict, List, Optional

from simulator.market_engine.estimator import MarketEstimator
from simulator.models.scenario import Scenario


class PortfolioImpactEngine:
    def __init__(self):
        self.market = MarketEstimator()

    def calculate_impact(
        self,
        scenario: Scenario,
        horizon_days: int,
        portfolio_allocation: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        if portfolio_allocation is None:
            portfolio_allocation = {
                "technology": 0.20,
                "financials": 0.15,
                "healthcare": 0.15,
                "consumer_cyclical": 0.10,
                "energy": 0.08,
                "defense": 0.05,
                "utilities": 0.05,
                "materials": 0.05,
                "bonds": 0.10,
                "cash": 0.07,
            }

        risk_score = sum(e.severity for e in scenario.injected_events) / max(len(scenario.injected_events), 1)
        sector_impacts = self.market.estimate_sector_impact(scenario, horizon_days, risk_score)

        total_portfolio_impact = 0.0
        sector_contributions = {}

        for sector, allocation in portfolio_allocation.items():
            if sector in sector_impacts:
                contribution = allocation * sector_impacts[sector]
                sector_contributions[sector] = {
                    "allocation": allocation,
                    "sector_impact": sector_impacts[sector],
                    "contribution": round(contribution, 4),
                }
                total_portfolio_impact += contribution

        volatility = self.market.estimate_market_volatility(scenario, horizon_days)
        correlation = self.market.correlation_shift(risk_score)

        return {
            "total_portfolio_impact": round(total_portfolio_impact, 4),
            "sector_contributions": sector_contributions,
            "estimated_volatility": volatility,
            "correlation_shift": correlation,
            "diversification_benefit": round(max(0.0, 1.0 - correlation), 4),
            "risk_score": risk_score,
            "horizon_days": horizon_days,
        }

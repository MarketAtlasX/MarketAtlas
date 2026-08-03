from __future__ import annotations

from typing import Any, Dict, List, Optional

from simulator.market_engine.estimator import MarketEstimator
from simulator.models.scenario import Scenario

DEFAULT_ALLOCATION = {
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


class PortfolioImpactEngine:
    def __init__(self):
        self.market = MarketEstimator()

    def calculate_impact(
        self,
        scenario: Scenario,
        horizon_days: int,
        portfolio_allocation: Optional[Dict[str, float]] = None,
        sector_data: Optional[Dict[str, Dict[str, float]]] = None,
    ) -> Dict[str, Any]:
        if portfolio_allocation is None:
            portfolio_allocation = dict(DEFAULT_ALLOCATION)

        risk_score = sum(e.severity for e in scenario.injected_events) / max(
            len(scenario.injected_events), 1
        )
        sector_impacts = self.market.estimate_sector_impact(
            scenario, horizon_days, risk_score
        )

        total_portfolio_impact = 0.0
        sector_contributions: Dict[str, Dict[str, float]] = {}

        for sector, allocation in portfolio_allocation.items():
            base_impact = sector_impacts.get(sector, 0.0)
            # Blend in live market return/volatility when available so the
            # simulated impact reflects current conditions rather than a
            # static beta alone.
            data = (sector_data or {}).get(sector, {})
            if data:
                live_return = data.get("return_pct", 0.0) / 100.0
                live_vol = data.get("volatility", 0.0) / 100.0
                blended = base_impact * 0.7 + live_return * 0.3
                impact = min(0.5, max(-0.5, blended))
                contribution = allocation * impact
                sector_contributions[sector] = {
                    "allocation": allocation,
                    "sector_impact": round(impact, 4),
                    "contribution": round(contribution, 4),
                    "return_pct": data.get("return_pct", 0.0),
                    "volatility": live_vol,
                }
            else:
                contribution = allocation * base_impact
                sector_contributions[sector] = {
                    "allocation": allocation,
                    "sector_impact": base_impact,
                    "contribution": round(contribution, 4),
                }
            total_portfolio_impact += contribution

        volatility = self.market.estimate_market_volatility(scenario, horizon_days)
        correlation = self.market.correlation_shift(risk_score)

        result: Dict[str, Any] = {
            "total_portfolio_impact": round(total_portfolio_impact, 4),
            "sector_contributions": sector_contributions,
            "estimated_volatility": volatility,
            "correlation_shift": correlation,
            "diversification_benefit": round(max(0.0, 1.0 - correlation), 4),
            "risk_score": risk_score,
            "horizon_days": horizon_days,
        }
        result.update(self._summary(result))
        return result

    def _summary(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Canonical human-facing summary + impact list for consumers."""
        contributions = result.get("sector_contributions", {})
        impacts = [
            {
                "name": f"sector_{sector}",
                "value": round(c["contribution"], 4),
                "direction": "up" if c["contribution"] > 0 else "down",
                "confidence": 0.6,
                "reasoning": (
                    f"{sector} contributes {c['contribution']:+.2%} "
                    f"to portfolio impact (impact {c['sector_impact']:+.2%})"
                ),
            }
            for sector, c in sorted(
                contributions.items(), key=lambda kv: abs(kv[1]["contribution"]), reverse=True
            )
        ]

        best = max(
            contributions.items(),
            key=lambda kv: kv[1]["sector_impact"],
            default=None,
        )
        worst = min(
            contributions.items(),
            key=lambda kv: kv[1]["sector_impact"],
            default=None,
        )

        risks: List[str] = []
        opportunities: List[str] = []
        if worst:
            risks.append(
                f"Overweight {worst[0]} hit hardest ({worst[1]['sector_impact']:+.2%})"
            )
        if best:
            opportunities.append(
                f"Overweight {best[0]} provides buffer ({best[1]['sector_impact']:+.2%})"
            )

        total = result["total_portfolio_impact"]
        return {
            "summary": f"Portfolio impact {total:+.2%} over {result['horizon_days']}d, "
            f"vol {result['estimated_volatility']:.1f}",
            "impacts": impacts,
            "risks": risks,
            "opportunities": opportunities,
        }

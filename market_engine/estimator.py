from __future__ import annotations

from typing import Any, Dict, List, Optional

from simulator.models.scenario import Scenario


class MarketEstimator:
    SECTOR_BETAS = {
        "technology": 1.2,
        "semiconductors": 1.4,
        "energy": 0.9,
        "defense": 0.7,
        "financials": 1.1,
        "healthcare": 0.6,
        "consumer_cyclical": 1.2,
        "consumer_defensive": 0.4,
        "utilities": 0.3,
        "materials": 1.0,
        "bonds": -0.3,
        "commodities": 0.8,
    }

    def estimate_sector_impact(
        self,
        scenario: Scenario,
        horizon_days: int,
        risk_score: float,
    ) -> Dict[str, float]:
        time_scale = min(1.0, horizon_days / 180.0)
        base_impact = -risk_score * time_scale

        impacts = {}
        for sector, beta in self.SECTOR_BETAS.items():
            impact = base_impact * beta
            noise = 0.0
            for event in scenario.injected_events:
                if sector in event.description.lower() or sector in event.title.lower():
                    noise += event.severity * 0.1 * beta
            impacts[sector] = round(max(-0.5, min(0.5, impact + noise)), 4)

        return impacts

    def estimate_market_volatility(
        self,
        scenario: Scenario,
        horizon_days: int,
        base_vix: float = 18.5,
    ) -> float:
        severity = sum(e.severity for e in scenario.injected_events)
        event_count = len(scenario.injected_events)
        avg_severity = severity / max(event_count, 1)

        vix_mult = 1.0 + avg_severity * 0.5 * min(1.0, horizon_days / 30.0)
        vix = base_vix * vix_mult
        return round(min(80.0, max(10.0, vix)), 1)

    def correlation_shift(self, risk_score: float) -> float:
        return round(min(0.8, risk_score * 0.6), 4)

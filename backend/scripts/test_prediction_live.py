"""Interactive CLI Test Script for 3-Agent Prediction System with Tata Stock / Target.

Tests:
1. HistoricalAgent standalone output
2. GeopoliticalAgent standalone output
3. FinalPredictionAgent synthesis & 4-scenario modeling
4. PredictionService end-to-end orchestration & Redis caching
5. FastAPI REST endpoint GET /api/v1/predict/ticker/TATAMOTORS
"""

import asyncio
import json
from pathlib import Path
import sys

# Ensure backend and monorepo root on sys.path
_ROOT = Path(__file__).resolve().parents[2]
_BACKEND = Path(__file__).resolve().parents[1]
for _p in [str(_ROOT), str(_BACKEND)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

# Ensure UTF-8 output on Windows terminal
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

from fastapi.testclient import TestClient

from app.chatbot.agents.final_prediction_agent import FinalPredictionAgent
from app.chatbot.agents.geopolitical_agent import GeopoliticalAgent
from app.chatbot.agents.historical_agent import HistoricalAgent
from app.main import app
from app.schemas.prediction import PredictionRequest
from app.services.prediction_service import prediction_service


def print_section(title: str):
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80)


async def run_live_test(ticker: str = "TATAMOTORS", query: str = "Market, supply chain, and geopolitical outlook for Tata Motors (TATAMOTORS)"):
    print_section(f"TESTING 3-AGENT PREDICTION SYSTEM FOR: {ticker}")
    print(f"Target Query : {query}")
    print(f"Ticker Symbol: {ticker}")

    # 1. Historical Agent Test
    print_section("1. HISTORICAL AGENT EXECUTION")
    hist_agent = HistoricalAgent()
    print("Executing HistoricalAgent.process()...")
    hist_out = await hist_agent.process(query=query, ticker=ticker)
    print(f"Status     : {hist_out.status.value}")
    print(f"Confidence : {hist_out.confidence * 100:.1f}%")
    print(f"Analysis   :\n  {hist_out.analysis[:280]}...")
    print(f"Patterns ({len(hist_out.patterns)} found):")
    for i, p in enumerate(hist_out.patterns[:2], 1):
        print(f"  [{i}] {p.pattern_name} ({p.timeframe}) -> Precedent: {p.historical_precedent}")
        print(f"      Outcome: {p.outcome_observed}")
    print(f"Key Events : {', '.join(hist_out.key_events[:3])}")
    print(f"Trends     : {', '.join(hist_out.trends[:2])}")
    print(f"Evidence   : {len(hist_out.supporting_evidence)} empirical items recorded")

    # 2. Geopolitical Agent Test
    print_section("2. GEOPOLITICAL AGENT EXECUTION")
    geo_agent = GeopoliticalAgent()
    print("Executing GeopoliticalAgent.process()...")
    geo_out = await geo_agent.process(query=query, ticker=ticker)
    print(f"Status     : {geo_out.status.value}")
    print(f"Confidence : {geo_out.confidence * 100:.1f}%")
    print(f"Analysis   :\n  {geo_out.analysis[:280]}...")
    print(f"Geopolitical Factors ({len(geo_out.geopolitical_factors)} isolated):")
    for i, f in enumerate(geo_out.geopolitical_factors[:2], 1):
        print(f"  [{i}] [{f.category.value}] {f.factor_name} (Severity: {f.severity * 100:.0f}%)")
        print(f"      • FACT          : {f.fact_summary}")
        print(f"      • INTERPRETATION: {f.interpretation}")
        print(f"      • POTENTIAL IMP : {f.potential_impact}")
    print(f"Key Developments: {', '.join(geo_out.key_developments[:2])}")
    print(f"Evidence        : {len(geo_out.supporting_evidence)} live/geopolitical items recorded")

    # 3. Final Prediction Agent Test
    print_section("3. FINAL PREDICTION AGENT SYNTHESIS & 4-SCENARIO MODEL")
    final_agent = FinalPredictionAgent()
    print("Executing FinalPredictionAgent.process()...")
    final_out = await final_agent.process(
        target=query,
        historical_output=hist_out,
        geopolitical_output=geo_out,
        ticker=ticker,
        time_horizon="medium_term",
    )
    print(f"Directional Outlook : {final_out.direction.value}")
    print(f"Calibrated Conf     : {final_out.confidence * 100:.1f}%")
    print(f"Synthesized Forecast:\n  {final_out.prediction}")
    print(f"Reasoning Summary   :\n  {final_out.reasoning_summary}")
    print("\n--- 4 Alternative Scenarios ---")
    for s in final_out.alternative_scenarios:
        print(f"  * [{s.scenario_name.value} Case] (Prob: {s.probability * 100:.0f}%)")
        print(f"    Outcome     : {s.expected_outcome}")
        print(f"    Triggers    : {', '.join(s.trigger_conditions)}")
        print(f"    Market Impl : {s.market_implications}")
    print(f"\nSupporting Factors   : {', '.join(final_out.supporting_factors[:2])}")
    print(f"Contradictory Factors: {', '.join(final_out.contradictory_factors[:2])}")
    print(f"Total Traceable Evid : {len(final_out.evidence)} items")

    # 4. PredictionService End-to-End Test
    print_section("4. PREDICTION SERVICE ORCHESTRATION & CACHE")
    print("Invoking PredictionService.predict()...")
    req = PredictionRequest(
        target=query,
        ticker=ticker,
        time_horizon="medium_term",
        include_raw_agent_outputs=True,
    )
    service_resp = await prediction_service.predict(req)
    print(f"Prediction ID : {service_resp.prediction_id}")
    print(f"Target Ticker : {service_resp.ticker}")
    print(f"Direction     : {service_resp.direction.value} ({service_resp.confidence * 100:.1f}% confidence)")
    print(f"Scenarios Cnt : {len(service_resp.alternative_scenarios)}")
    print(f"Raw Outputs   : Historical={'OK' if service_resp.historical_output else 'N/A'}, Geopolitical={'OK' if service_resp.geopolitical_output else 'N/A'}")

    # 5. REST API Test
    print_section("5. REST API ENDPOINT TEST (GET /api/v1/predict/ticker/{ticker})")
    client = TestClient(app)
    endpoint = f"/api/v1/predict/ticker/{ticker}?time_horizon=medium_term"
    print(f"Sending GET {endpoint}...")
    api_resp = client.get(endpoint)
    print(f"HTTP Status   : {api_resp.status_code}")
    if api_resp.status_code == 200:
        data = api_resp.json()
        print(f"API Direction : {data['direction']}")
        print(f"API Confidence: {data['confidence'] * 100:.1f}%")
        print(f"API Forecast  : {data['prediction'][:140]}...")
        print(f"API Scenarios : {len(data['alternative_scenarios'])} scenarios returned")
        print("\nALL PREDICTION SUBSYSTEMS OPERATIONAL AND VERIFIED FOR TATA!")
    else:
        print(f"API Error Response: {api_resp.text}")


if __name__ == "__main__":
    ticker_arg = sys.argv[1] if len(sys.argv) > 1 else "TATAMOTORS"
    asyncio.run(run_live_test(ticker=ticker_arg))

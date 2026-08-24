import asyncio
from pathlib import Path
import sys
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

# Ensure monorepo root and backend are on sys.path
_ROOT = Path(__file__).resolve().parents[3]
_BACKEND = Path(__file__).resolve().parents[2]
for _p in [str(_ROOT), str(_BACKEND)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from app.chatbot.agents.final_prediction_agent import FinalPredictionAgent
from app.chatbot.agents.geopolitical_agent import GeopoliticalAgent
from app.chatbot.agents.historical_agent import HistoricalAgent
from app.schemas.prediction import (
    AgentStatus,
    AlternativeScenario,
    EvidenceItem,
    FinalPredictionOutput,
    GeopoliticalAgentOutput,
    GeopoliticalFactor,
    GeopoliticalFactorCategory,
    HistoricalAgentOutput,
    HistoricalPattern,
    PredictionDirection,
    PredictionRequest,
    PredictionResponse,
    ScenarioType,
    SourceType,
)
from app.services.prediction_service import PredictionService


class TestHistoricalAgent(unittest.IsolatedAsyncioTestCase):
    """Test HistoricalAgent behavior and resilience."""

    async def asyncSetUp(self):
        self.agent = HistoricalAgent()

    async def test_historical_agent_success(self):
        """Test valid historical analysis returns structured HistoricalAgentOutput."""
        result = await self.agent.process(
            query="Impact of energy corridor sanctions on oil prices",
            ticker="XOM",
        )
        self.assertIsInstance(result, HistoricalAgentOutput)
        self.assertEqual(result.agent, "HistoricalAgent")
        self.assertIn(result.status, [AgentStatus.SUCCESS, AgentStatus.DEGRADED])
        self.assertGreaterEqual(result.confidence, 0.1)
        self.assertLessEqual(result.confidence, 1.0)
        self.assertTrue(len(result.patterns) >= 1)
        self.assertTrue(len(result.key_events) >= 1)
        self.assertTrue(len(result.trends) >= 1)
        self.assertTrue(len(result.risk_factors) >= 1)
        self.assertTrue(len(result.uncertainties) >= 1)

    async def test_historical_agent_empty_data_graceful(self):
        """Test HistoricalAgent handles completely unknown topic with graceful deterministic fallback."""
        result = await self.agent.process(
            query="Completely obscure non-existent topic xyz12345",
        )
        self.assertIsInstance(result, HistoricalAgentOutput)
        self.assertIsNotNone(result.analysis)
        self.assertTrue(len(result.patterns) >= 1)
        self.assertGreater(result.confidence, 0.0)

    async def test_historical_agent_custom_json_parsing(self):
        """Test parser handles JSON response correctly."""
        mock_json = """
        {
          "analysis": "Historical precedent indicates cyclical 90-day adjustments.",
          "patterns": [
            {
              "pattern_name": "Sanctions Shock Rebalancing",
              "description": "Initial 20% spike followed by alternative corridor routing.",
              "historical_precedent": "2022 Energy Sanctions",
              "timeframe": "1-3 months",
              "outcome_observed": "Logistics stabilization within 60 days",
              "confidence": 0.85
            }
          ],
          "key_events": ["1973 Oil Crisis", "2022 Embargo"],
          "trends": ["Long-term supplier diversification"],
          "risk_factors": ["Protracted supply shortfall"],
          "confidence": 0.82,
          "uncertainties": ["New pipeline infrastructure"],
          "data_sources": ["Historical Archives"]
        }
        """
        with patch.object(self.agent.llm, "generate", return_value=mock_json):
            result = await self.agent.process("Sanctions impact")
            self.assertEqual(result.confidence, 0.82)
            self.assertEqual(len(result.patterns), 1)
            self.assertEqual(result.patterns[0].pattern_name, "Sanctions Shock Rebalancing")
            self.assertEqual(result.key_events, ["1973 Oil Crisis", "2022 Embargo"])


class TestGeopoliticalAgent(unittest.IsolatedAsyncioTestCase):
    """Test GeopoliticalAgent behavior and resilience."""

    async def asyncSetUp(self):
        self.agent = GeopoliticalAgent()

    async def test_geopolitical_agent_success(self):
        """Test valid geopolitical analysis returns structured GeopoliticalAgentOutput."""
        result = await self.agent.process(
            query="Taiwan semiconductor supply chain security and export controls",
            ticker="NVDA",
        )
        self.assertIsInstance(result, GeopoliticalAgentOutput)
        self.assertEqual(result.agent, "GeopoliticalAgent")
        self.assertIn(result.status, [AgentStatus.SUCCESS, AgentStatus.DEGRADED])
        self.assertGreaterEqual(result.confidence, 0.1)
        self.assertTrue(len(result.key_developments) >= 1)
        self.assertTrue(len(result.geopolitical_factors) >= 1)
        # Verify fact vs inference separation
        factor = result.geopolitical_factors[0]
        self.assertIsNotNone(factor.fact_summary)
        self.assertIsNotNone(factor.interpretation)
        self.assertIsNotNone(factor.potential_impact)

    async def test_geopolitical_agent_world_state_fallback(self):
        """Test GeopoliticalAgent falls back gracefully when WorldState is unavailable."""
        with patch("app.services.world_state_client.WorldStateClient.get_global_risk", side_effect=Exception("Service Down")):
            result = await self.agent.process("Middle East maritime transit security")
            self.assertIsInstance(result, GeopoliticalAgentOutput)
            self.assertIsNotNone(result.analysis)
            self.assertTrue(len(result.risk_factors) >= 1)


class TestFinalPredictionAgent(unittest.IsolatedAsyncioTestCase):
    """Test FinalPredictionAgent synthesis, scenario modeling, and partial failure handling."""

    async def asyncSetUp(self):
        self.agent = FinalPredictionAgent()

        self.sample_hist = HistoricalAgentOutput(
            agent="HistoricalAgent",
            status=AgentStatus.SUCCESS,
            target="NVDA semiconductor outlook",
            analysis="Historical supply chain shocks typically result in temporary multiple contraction followed by premium recovery.",
            patterns=[
                HistoricalPattern(
                    pattern_name="Chip Cycle Shock & Rebound",
                    description="Export restriction announcements produce sharp initial pullbacks followed by pricing power consolidation.",
                    historical_precedent="2018 Trade Dispute & 2020 Supply Shortages",
                    timeframe="1-3 months",
                    outcome_observed="Margin resilience and market share defense",
                    confidence=0.8,
                )
            ],
            key_events=["2018 Section 301 Tariffs", "2022 Advanced Compute Export Rules"],
            trends=["Structural demand secular growth", "Geographic fab diversification"],
            supporting_evidence=[
                EvidenceItem(
                    source="Historical Archives",
                    source_type=SourceType.HISTORICAL_DB,
                    date="2022-10-07",
                    agent="HistoricalAgent",
                    evidence="Previous export curbs led to modified chip architectures preserving major market access.",
                    impact="structural_adaptation",
                    confidence=0.85,
                )
            ],
            risk_factors=["Prolonged wafer lead time expansion"],
            confidence=0.80,
            uncertainties=["Foundry ramp speeds in non-traditional geographies"],
            data_sources=["MarketAtlas DB"],
        )

        self.sample_geo = GeopoliticalAgentOutput(
            agent="GeopoliticalAgent",
            status=AgentStatus.SUCCESS,
            target="NVDA semiconductor outlook",
            analysis="Geopolitical friction remains elevated with multilateral export licensing frameworks intensifying scrutiny.",
            key_developments=["Updated bilateral export restrictions", "Allied semiconductor alliance commitments"],
            geopolitical_factors=[
                GeopoliticalFactor(
                    factor_name="Advanced Compute Export Scrutiny",
                    category=GeopoliticalFactorCategory.TRADE,
                    fact_summary="Governments requiring individual export licenses for high-density accelerator architectures.",
                    interpretation="Attempt to constrain sovereign AI military capabilities while maintaining commercial baseline.",
                    potential_impact="Tailored regional silicon variants required to maintain global volume.",
                    severity=0.70,
                    uncertainty="Future expansion of threshold compute definitions.",
                )
            ],
            potential_impacts=["Localized revenue friction", "Increased compliance and engineering overhead"],
            supporting_evidence=[
                EvidenceItem(
                    source="World State Intelligence",
                    source_type=SourceType.LIVE_STREAM,
                    date="2026-08-20",
                    agent="GeopoliticalAgent",
                    evidence="Export licensing frameworks active across key Asian trade corridors.",
                    impact="regulatory_friction",
                    confidence=0.82,
                )
            ],
            risk_factors=["Secondary sanctions enforcement on unapproved distribution channels"],
            confidence=0.78,
            uncertainties=["Multilateral summit negotiations may modify technical thresholds"],
            data_sources=["Dynamic World State", "GDELT Live"],
        )

    async def test_full_synthesis_success(self):
        """Test FinalPredictionAgent synthesizes both agents into 4 scenarios with reconciled evidence."""
        result = await self.agent.process(
            target="NVDA semiconductor outlook",
            historical_output=self.sample_hist,
            geopolitical_output=self.sample_geo,
            ticker="NVDA",
            time_horizon="medium_term",
        )
        self.assertIsInstance(result, FinalPredictionOutput)
        self.assertEqual(result.target, "NVDA semiconductor outlook")
        self.assertEqual(result.ticker, "NVDA")
        self.assertIn(result.direction, [PredictionDirection.BULLISH, PredictionDirection.BEARISH, PredictionDirection.NEUTRAL, PredictionDirection.VOLATILE])
        self.assertGreaterEqual(result.confidence, 0.5)
        self.assertLessEqual(result.confidence, 1.0)
        self.assertTrue(len(result.alternative_scenarios) >= 4)
        
        # Verify scenario types
        scenario_types = [s.scenario_name for s in result.alternative_scenarios]
        self.assertIn(ScenarioType.BASE, scenario_types)
        self.assertIn(ScenarioType.BULL, scenario_types)
        self.assertIn(ScenarioType.BEAR, scenario_types)
        self.assertIn(ScenarioType.TAIL_RISK, scenario_types)

        # Verify evidence traceability preserved
        self.assertTrue(len(result.evidence) >= 2)
        sources = [e.source for e in result.evidence]
        self.assertTrue(any("Historical" in s or "Archives" in s for s in sources))
        self.assertTrue(any("World State" in s or "Live" in s or "FinalPredictionAgent" in s for s in sources))

    async def test_historical_agent_failure_resilience(self):
        """Test FinalPredictionAgent continues with calibrated confidence when HistoricalAgent fails."""
        failed_hist = HistoricalAgentOutput(
            agent="HistoricalAgent",
            status=AgentStatus.FAILED,
            target="Target",
            analysis="Historical analysis failed.",
            confidence=0.0,
            error="Connection timeout",
        )
        result = await self.agent.process(
            target="Target",
            historical_output=failed_hist,
            geopolitical_output=self.sample_geo,
        )
        self.assertIsInstance(result, FinalPredictionOutput)
        self.assertIsNotNone(result.prediction)
        # Confidence should reflect single-source uncertainty
        self.assertLessEqual(result.confidence, 0.75)

    async def test_geopolitical_agent_failure_resilience(self):
        """Test FinalPredictionAgent continues with calibrated confidence when GeopoliticalAgent fails."""
        failed_geo = GeopoliticalAgentOutput(
            agent="GeopoliticalAgent",
            status=AgentStatus.FAILED,
            target="Target",
            analysis="Geopolitical analysis failed.",
            confidence=0.0,
            error="World State service down",
        )
        result = await self.agent.process(
            target="Target",
            historical_output=self.sample_hist,
            geopolitical_output=failed_geo,
        )
        self.assertIsInstance(result, FinalPredictionOutput)
        self.assertIsNotNone(result.prediction)
        self.assertLessEqual(result.confidence, 0.75)

    async def test_both_agents_failed_insufficient_evidence(self):
        """Test FinalPredictionAgent explicitly reports insufficient evidence when both agents fail."""
        failed_hist = HistoricalAgentOutput(agent="HistoricalAgent", status=AgentStatus.FAILED, target="X", analysis="", confidence=0.0)
        failed_geo = GeopoliticalAgentOutput(agent="GeopoliticalAgent", status=AgentStatus.FAILED, target="X", analysis="", confidence=0.0)
        
        result = await self.agent.process(
            target="Unknown Topic",
            historical_output=failed_hist,
            geopolitical_output=failed_geo,
        )
        self.assertIsInstance(result, FinalPredictionOutput)
        self.assertEqual(result.direction, PredictionDirection.UNCERTAIN)
        self.assertLessEqual(result.confidence, 0.25)
        self.assertIn("Insufficient", result.prediction)


class TestPredictionService(unittest.IsolatedAsyncioTestCase):
    """Test PredictionService orchestrator and end-to-end execution."""

    async def asyncSetUp(self):
        self.service = PredictionService()

    async def test_prediction_service_end_to_end(self):
        """Test full PredictionService predict flow."""
        req = PredictionRequest(
            target="Global energy corridor stability and Brent crude trajectory",
            ticker="XOM",
            time_horizon="medium_term",
            include_raw_agent_outputs=True,
        )
        resp = await self.service.predict(req)
        self.assertIsInstance(resp, PredictionResponse)
        self.assertEqual(resp.ticker, "XOM")
        self.assertIsNotNone(resp.prediction_id)
        self.assertIsNotNone(resp.prediction)
        self.assertIsNotNone(resp.reasoning_summary)
        self.assertTrue(len(resp.alternative_scenarios) >= 4)
        self.assertTrue(len(resp.supporting_factors) >= 1)
        self.assertTrue(len(resp.contradictory_factors) >= 1)
        self.assertTrue(len(resp.risk_factors) >= 1)
        self.assertTrue(len(resp.uncertainties) >= 1)
        self.assertIsNotNone(resp.historical_output)
        self.assertIsNotNone(resp.geopolitical_output)


if __name__ == "__main__":
    unittest.main()

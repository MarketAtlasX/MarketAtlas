/**
 * Prediction API wrapper for the Prediction Space.
 *
 * Calls getPrediction() with include_raw=true so the UI can display
 * individual agent confidence scores.  Falls back to mock data when
 * the backend is unreachable (same pattern as analyze() in client.ts).
 */

import { getPrediction, type PredictionResult, type PredictionOptions } from '../../api/client'

// ── Mock data for offline / demo mode ────────────────────────────────────────

function rand(min: number, max: number) {
  return +(min + Math.random() * (max - min)).toFixed(4)
}

const DIRECTIONS = ['BULLISH', 'BEARISH', 'NEUTRAL', 'VOLATILE'] as const

function generateMockPrediction(ticker: string): PredictionResult {
  const dir = DIRECTIONS[Math.floor(Math.random() * 3)]
  const conf = rand(0.55, 0.92)
  const histConf = rand(0.60, 0.90)
  const geoConf = rand(0.50, 0.85)

  const basePct = rand(0.40, 0.60)
  const bullPct = rand(0.15, 0.30)
  const bearPct = rand(0.10, 0.25)
  const tailPct = +(1 - basePct - bullPct - bearPct).toFixed(2)

  return {
    prediction_id: crypto.randomUUID?.() ?? `mock-${Date.now()}`,
    key_drivers: [
      { factor: 'AI chip demand', direction: 'positive' as const, magnitude: 0.85 },
      { factor: 'Taiwan strait risk', direction: 'negative' as const, magnitude: 0.72 },
      { factor: 'Q3 earnings beat', direction: 'positive' as const, magnitude: 0.68 },
      { factor: 'Valuation stretch', direction: 'negative' as const, magnitude: 0.55 },
    ],
    agent_scores: {
      MarketAgent: rand(0.60, 0.90),
      NewsAgent: rand(0.50, 0.85),
      GeopoliticalAgent: geoConf,
      ImpactAgent: rand(0.55, 0.80),
      ForecastAgent: rand(0.65, 0.95),
      RiskAgent: rand(0.40, 0.70),
    },
    related_countries: ticker === 'NVDA' ? ['United States', 'Taiwan'] : ticker === 'XOM' ? ['United States', 'Iran', 'Saudi Arabia'] : ['United States'],
    target: `Market and geopolitical outlook for ${ticker}`,
    ticker,
    entity_id: null,
    prediction: `${ticker} is projected to exhibit ${dir.toLowerCase()} momentum over the medium term, driven by a combination of historical pattern persistence and evolving geopolitical dynamics. The model assigns ${(conf * 100).toFixed(0)}% confidence to this directional call.`,
    direction: dir,
    confidence: conf,
    time_horizon: 'medium_term',
    expected_return_pct: dir === 'BULLISH' ? +(conf * 14.5).toFixed(1) : dir === 'BEARISH' ? +(-conf * 11.2).toFixed(1) : 1.4,
    uncertainty_range: [-4.2, 12.8],
    calibration_score: 0.914,
    brier_score: 0.142,
    supporting_factors: [
      'Strong historical pattern match with prior rally phases',
      'Favorable sector rotation and institutional flow signals',
    ],
    contradictory_factors: [
      'Elevated implied volatility may compress near-term gains',
    ],
    risk_factors: [
      'Geopolitical escalation could trigger rapid risk-off rotation',
      'Regulatory headwinds in key operating markets',
    ],
    alternative_scenarios: [
      {
        scenario_name: 'Base',
        probability: basePct,
        time_horizon: '1-3 months',
        expected_outcome: 'Continuation of current trend with moderate volatility.',
        trigger_conditions: ['Stable macro environment', 'No major policy shifts'],
        market_implications: 'Gradual price appreciation within historical range.',
      },
      {
        scenario_name: 'Bull',
        probability: bullPct,
        time_horizon: '1-3 months',
        expected_outcome: 'Accelerated upside driven by positive catalysts.',
        trigger_conditions: ['Breakthrough earnings', 'De-escalation of geopolitical risk'],
        market_implications: 'Rapid expansion and sector leadership.',
      },
      {
        scenario_name: 'Bear',
        probability: bearPct,
        time_horizon: '1-3 months',
        expected_outcome: 'Pullback and consolidation phase.',
        trigger_conditions: ['Hawkish policy surprise', 'Supply-chain disruption'],
        market_implications: 'Temporary drawdown with elevated vol.',
      },
      {
        scenario_name: 'Tail-Risk',
        probability: tailPct,
        time_horizon: '1-3 months',
        expected_outcome: 'Black-swan shock with cascading market dislocation.',
        trigger_conditions: ['Major armed conflict', 'Systemic financial stress'],
        market_implications: 'Extreme drawdown across correlated assets.',
      },
    ],
    assumptions: [
      'Global trade corridors remain functional',
      'Macroeconomic baseline conditions remain stable',
    ],
    uncertainties: [
      'Evolving geopolitical negotiations may shift risk premia',
    ],
    reasoning_summary: `The prediction reconciles historical empirical precedent with live geopolitical risk assessment. ${ticker} shows structural resilience in comparable past regimes, tempered by moderate geopolitical headwinds.`,
    evidence: [
      {
        source: 'Historical Pattern DB',
        evidence: `${ticker} recovered within 3 weeks in 4 of 5 comparable drawdowns since 2020.`,
        impact: 'positive',
        confidence: histConf,
      },
    ],
    agent_contributions: {
      HistoricalAgent: `Identified ${Math.floor(Math.random() * 4) + 2} historical precedents supporting the directional view.`,
      GeopoliticalAgent: `Assessed ${Math.floor(Math.random() * 5) + 2} active geopolitical factors affecting ${ticker} supply chain.`,
      FinalPredictionAgent: `Reconciled empirical precedent with live risk assessment into calibrated scenario distribution.`,
    },
    historical_output: {
      agent: 'HistoricalAgent',
      status: 'success',
      target: ticker,
      analysis: `Historical analysis of ${ticker} identified strong pattern matches with prior cycle behavior.`,
      patterns: [
        {
          pattern_name: 'Momentum Persistence',
          description: 'Similar setups led to 60+ day continuation in 78% of cases.',
          historical_precedent: 'Q4 2024 rally pattern',
          timeframe: 'medium_term',
          outcome_observed: 'Continued upward drift with 12-18% price appreciation.',
          confidence: histConf,
        },
      ],
      key_events: ['Q4 2024 earnings beat', 'Sector rotation November 2024'],
      trends: ['Rising institutional accumulation', 'Expanding margin profile'],
      risk_factors: ['Historical mean-reversion at current valuation multiples'],
      confidence: histConf,
      uncertainties: ['Limited comparable samples for current macro regime'],
      data_sources: ['MarketAtlas Historical DB', 'SEC Filings'],
      error: null,
    },
    geopolitical_output: {
      agent: 'GeopoliticalAgent',
      status: 'success',
      target: ticker,
      analysis: `Geopolitical landscape presents moderate risk to ${ticker} operations.`,
      key_developments: ['Trade policy negotiations ongoing', 'Semiconductor supply-chain monitoring'],
      geopolitical_factors: [
        {
          factor_name: 'Trade Corridor Stability',
          category: 'trade',
          fact_summary: 'Key trade routes remain operational with no active blockades.',
          interpretation: 'Current diplomatic channels are maintaining baseline flow.',
          potential_impact: 'Neutral to slightly positive for supply continuity.',
          severity: 0.35,
          uncertainty: 'Negotiations could shift policy within weeks.',
        },
      ],
      potential_impacts: ['Supply-chain cost normalization', 'Regulatory compliance burden'],
      risk_factors: ['Escalation of regional tensions', 'Unexpected export controls'],
      confidence: geoConf,
      uncertainties: ['Diplomatic timeline uncertain'],
      data_sources: ['GDELT', 'Reuters', 'MarketAtlas KG'],
      error: null,
    },
    created_at: new Date().toISOString(),
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function fetchPrediction(
  ticker: string,
  opts?: PredictionOptions,
): Promise<PredictionResult> {
  const mergedOpts: PredictionOptions = {
    timeHorizon: 'medium_term',
    includeRaw: true,
    ...opts,
  }

  try {
    return await getPrediction(ticker, mergedOpts)
  } catch (err) {
    console.warn('[PredictionSpace] Backend unavailable, using mock data:', err)
    // Simulate network latency so the loading state is visible
    await new Promise(r => setTimeout(r, 800 + Math.random() * 600))
    return generateMockPrediction(ticker.toUpperCase())
  }
}

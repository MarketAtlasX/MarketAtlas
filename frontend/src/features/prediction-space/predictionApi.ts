/**
 * Prediction API wrapper for the Prediction Space.
 */

import { getPrediction, type PredictionResult, type PredictionOptions } from '../../api/client'

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
    target: `Market and geopolitical outlook for ${ticker}`,
    ticker,
    entity_id: null,
    prediction: `${ticker} is projected to exhibit ${dir.toLowerCase()} momentum over the medium term.`,
    direction: dir,
    confidence: conf,
    time_horizon: 'medium_term',
    supporting_factors: [],
    contradictory_factors: [],
    risk_factors: [],
    alternative_scenarios: [],
    assumptions: [],
    uncertainties: [],
    reasoning_summary: '',
    evidence: [],
    agent_contributions: {},
    historical_output: null,
    geopolitical_output: null,
    created_at: new Date().toISOString(),
  }
}

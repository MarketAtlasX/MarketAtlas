import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  timeout: 2000,
})

let backendAvailable: boolean | null = null
let checkingBackend = false
let checkQueue: Array<(v: boolean) => void> = []

function checkBackend(): Promise<boolean> {
  if (backendAvailable !== null) return Promise.resolve(backendAvailable)
  if (checkingBackend) {
    return new Promise(resolve => checkQueue.push(resolve))
  }
  checkingBackend = true
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 1000)
  return fetch('/api/health', { signal: controller.signal })
    .then(r => {
      backendAvailable = r.ok
      return backendAvailable
    })
    .catch(() => {
      backendAvailable = false
      return false
    })
    .finally(() => {
      clearTimeout(timeout)
      checkingBackend = false
      checkQueue.forEach(r => r(backendAvailable!))
      checkQueue = []
    })
}

export interface MarketSnapshot {
  symbol: string
  momentum: number
  volatility: number
  volume_status: string
}

export interface ImpactResult {
  composite_risk: number
  local_severity: number
  entity_count: number
  relations: Array<{ source: string; target: string; label: string }>
}

export interface Recommendation {
  action: 'BUY' | 'HOLD' | 'SELL'
  reason: string
  confidence: number
}

export interface AnalysisResult {
  snapshot: MarketSnapshot
  impact: ImpactResult
  recommendation: Recommendation
}

export interface PredictionScenario {
  scenario_name: 'Base' | 'Bull' | 'Bear' | 'Tail-Risk'
  probability: number
  time_horizon: string
  expected_outcome: string
  trigger_conditions: string[]
  market_implications: string
}

export interface HistoricalPattern {
  pattern_name: string
  description: string
  historical_precedent: string
  timeframe: string
  outcome_observed: string
  confidence: number
}

export interface GeopoliticalFactor {
  factor_name: string
  category: string
  fact_summary: string
  interpretation: string
  potential_impact: string
  severity: number
  uncertainty: string
}

export interface HistoricalAgentOutput {
  agent: string
  status: 'success' | 'degraded' | 'failed' | 'no_data'
  target: string
  analysis: string
  patterns: HistoricalPattern[]
  key_events: string[]
  trends: string[]
  risk_factors: string[]
  confidence: number
  uncertainties: string[]
  data_sources: string[]
  error: string | null
}

export interface GeopoliticalAgentOutput {
  agent: string
  status: 'success' | 'degraded' | 'failed' | 'no_data'
  target: string
  analysis: string
  key_developments: string[]
  geopolitical_factors: GeopoliticalFactor[]
  potential_impacts: string[]
  risk_factors: string[]
  confidence: number
  uncertainties: string[]
  data_sources: string[]
  error: string | null
}

export interface PredictionResult {
  prediction_id: string
  target: string
  ticker: string | null
  entity_id: number | null
  prediction: string
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'VOLATILE' | 'UNCERTAIN'
  confidence: number
  time_horizon: string
  supporting_factors: string[]
  contradictory_factors: string[]
  risk_factors: string[]
  alternative_scenarios: PredictionScenario[]
  assumptions: string[]
  uncertainties: string[]
  reasoning_summary: string
  evidence: Array<{ source: string; evidence: string; impact: string; confidence: number }>
  agent_contributions: Record<string, string>
  historical_output: HistoricalAgentOutput | null
  geopolitical_output: GeopoliticalAgentOutput | null
  created_at: string
  key_drivers?: Array<{ factor: string; direction: 'positive' | 'negative'; magnitude: number }>
  agent_scores?: Record<string, number>
  related_countries?: string[]
}

export interface PredictionOptions {
  timeHorizon?: 'short_term' | 'medium_term' | 'long_term'
  includeRaw?: boolean
}

export async function getPrediction(
  symbol: string,
  opts?: PredictionOptions,
): Promise<PredictionResult> {
  const params: Record<string, string> = {}
  if (opts?.timeHorizon) params.time_horizon = opts.timeHorizon
  if (opts?.includeRaw) params.include_raw = 'true'
  const { data } = await api.get<PredictionResult>(
    `/predict/ticker/${encodeURIComponent(symbol)}`,
    { params },
  )
  return data
}

const stocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'JPM', 'V', 'NVDA', 'META', 'SPY']

function rand(min: number, max: number) { return +(min + Math.random() * (max - min)).toFixed(4) }

function generateMockData(symbol?: string): AnalysisResult {
  if (!symbol) symbol = stocks[Math.floor(Math.random() * stocks.length)]
  return {
    snapshot: {
      symbol,
      momentum: rand(-0.08, 0.12),
      volatility: rand(0.01, 0.06),
      volume_status: ['surge', 'normal', 'thin'][Math.floor(Math.random() * 3)],
    },
    impact: {
      composite_risk: rand(0.1, 0.9),
      local_severity: rand(0.1, 0.8),
      entity_count: Math.floor(Math.random() * 10) + 2,
      relations: [
        { source: 'Russia', target: 'Oil', label: 'sanction' },
        { source: 'China', target: 'Tech', label: 'restriction' },
      ],
    },
    recommendation: {
      action: (['BUY', 'HOLD', 'SELL'] as const)[Math.floor(Math.random() * 3)],
      reason: 'Geopolitical risk assessment combined with market momentum analysis.',
      confidence: rand(0.5, 0.95),
    },
  }
}

export async function analyze(text: string, symbol?: string): Promise<AnalysisResult> {
  const online = await checkBackend()
  if (!online) return generateMockData(symbol)
  try {
    const { data } = await api.post<AnalysisResult>('/analyze', { text })
    if (symbol) data.snapshot.symbol = symbol
    return data
  } catch {
    backendAvailable = false
    return generateMockData(symbol)
  }
}

export async function getHealth(): Promise<boolean> {
  return checkBackend()
}

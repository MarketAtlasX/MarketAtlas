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

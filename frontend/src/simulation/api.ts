import axios from 'axios'
import type {
  Scenario,
  Simulation,
  SimulationReport,
  SimulationRun,
  SimulationBranch,
  CounterfactualResult,
  ChiefReport,
  WSMessage,
  Portfolio,
  SimulationRunRecord,
  SectorSnapshot,
  PortfolioImpact,
} from './types'
import { ensureAuth, getToken } from './auth'

const simApi = axios.create({
  baseURL: '/api',
  timeout: 120000,
})

simApi.interceptors.request.use(async (config) => {
  const token = getToken() || (await ensureAuth())
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const portfolioApi = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

portfolioApi.interceptors.request.use(async (config) => {
  const token = getToken() || (await ensureAuth())
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export async function parseScenario(text: string): Promise<{ scenario_id: string; parsed: Scenario }> {
  const { data } = await simApi.post('/simulation/parse', { text })
  return data
}

export async function createScenario(payload: {
  title: string
  description: string
  events: Record<string, unknown>[]
  assumptions?: Record<string, unknown>[]
  duration_days?: number
  uncertainty?: number
  tags?: string[]
}): Promise<{ scenario_id: string; simulation_id: string; scenario: Scenario }> {
  const { data } = await simApi.post('/simulation/create', payload)
  return data
}

export async function runSimulation(
  scenarioId: string,
  horizons?: number[],
  monteCarloRuns = 100
): Promise<{ run_id: string; simulation_id: string; status: string; summary: Record<string, unknown>; chief_report: ChiefReport }> {
  const { data } = await simApi.post('/simulation/run', {
    scenario_id: scenarioId,
    horizons,
    monte_carlo_runs: monteCarloRuns,
  })
  return data
}

export async function getSimulation(simulationId: string): Promise<Simulation> {
  const { data } = await simApi.get(`/simulation/${simulationId}`)
  return data
}

export async function getTimeline(simulationId: string): Promise<Record<string, unknown>> {
  const { data } = await simApi.get(`/simulation/${simulationId}/timeline`)
  return data
}

export async function getGraph(simulationId: string): Promise<Record<string, unknown>> {
  const { data } = await simApi.get(`/simulation/${simulationId}/graph`)
  return data
}

export async function getAgentReports(simulationId: string): Promise<{ chief_report: ChiefReport; agent_reports: Record<string, unknown> }> {
  const { data } = await simApi.get(`/simulation/${simulationId}/agents`)
  return data
}

export async function getReport(simulationId: string): Promise<SimulationReport> {
  const { data } = await simApi.get(`/simulation/${simulationId}/report`)
  return data
}

export async function getConfidence(simulationId: string): Promise<Record<string, unknown>> {
  const { data } = await simApi.get(`/simulation/${simulationId}/confidence`)
  return data
}

export async function getPortfolioImpact(simulationId: string, horizonDays = 90): Promise<Record<string, unknown>> {
  const { data } = await simApi.get(`/simulation/${simulationId}/portfolio`, {
    params: { horizon_days: horizonDays },
  })
  return data
}

export async function getBranches(simulationId: string): Promise<{ branches: SimulationBranch[]; scenario_id: string }> {
  const { data } = await simApi.get(`/simulation/${simulationId}/branches`)
  return data
}

export async function runCounterfactual(
  simulationId: string,
  modifications: Record<string, unknown>[]
): Promise<CounterfactualResult> {
  const { data } = await simApi.post(`/simulation/${simulationId}/counterfactual`, {
    scenario_id: simulationId,
    run_id: '',
    modifications,
  })
  return data
}

export async function runSensitivity(
  simulationId: string,
  targetMetric: string
): Promise<{ target_metric: string; results: Record<string, unknown>[] }> {
  const { data } = await simApi.post(`/simulation/${simulationId}/sensitivity`, {
    scenario_id: simulationId,
    target_metric: targetMetric,
  })
  return data
}

export async function listSimulations(): Promise<{ simulations: Simulation[]; total: number }> {
  const { data } = await simApi.get('/simulation/')
  return data
}

export async function listPortfolios(): Promise<Portfolio[]> {
  const { data } = await portfolioApi.get('/portfolios')
  return data
}

export async function createPortfolio(name: string, allocation: Record<string, number>): Promise<Portfolio> {
  const { data } = await portfolioApi.post('/portfolios', { name, allocation })
  return data
}

export async function getPortfolio(portfolioId: string): Promise<Portfolio> {
  const { data } = await portfolioApi.get(`/portfolios/${portfolioId}`)
  return data
}

export async function updatePortfolio(
  portfolioId: string,
  patch: Partial<{ name: string; allocation: Record<string, number> }>
): Promise<Portfolio> {
  const { data } = await portfolioApi.patch(`/portfolios/${portfolioId}`, patch)
  return data
}

export async function deletePortfolio(portfolioId: string): Promise<void> {
  await portfolioApi.delete(`/portfolios/${portfolioId}`)
}

export async function createSimulationRun(
  portfolioId: string,
  scenario: Record<string, unknown>
): Promise<SimulationRunRecord> {
  const { data } = await portfolioApi.post('/simulations', {
    portfolio_id: portfolioId,
    scenario,
  })
  return data
}

export async function getSimulationRun(runId: string): Promise<SimulationRunRecord> {
  const { data } = await portfolioApi.get(`/simulations/${runId}`)
  return data
}

export async function listSimulationRuns(): Promise<SimulationRunRecord[]> {
  const { data } = await portfolioApi.get('/simulations')
  return data
}

export async function getSectorSnapshot(): Promise<SectorSnapshot> {
  const { data } = await portfolioApi.get('/market-data/sectors')
  return data
}

export async function fetchPortfolioImpact(runId: string): Promise<PortfolioImpact | null> {
  const run = await getSimulationRun(runId)
  return run.result?.portfolio_impact ?? null
}

export function createSimulationWebSocket(
  onMessage: (msg: WSMessage) => void,
  onConnected?: () => void
): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  const token = getToken()
  const baseUrl = import.meta.env.VITE_SIMULATOR_WS_URL || `${protocol}//${host}`
  const wsUrl = token
    ? `${baseUrl}/ws/simulation?token=${encodeURIComponent(token)}`
    : `${baseUrl}/ws/simulation`
  const ws = new WebSocket(wsUrl)

  ws.onopen = () => {
    onConnected?.()
    ws.send(JSON.stringify({ type: 'subscribe', channel: 'simulation' }))
  }

  ws.onmessage = (event) => {
    try {
      const msg: WSMessage = JSON.parse(event.data)
      onMessage(msg)
    } catch { /* ignore */ }
  }

  ws.onerror = () => { ws.close() }

  return ws
}

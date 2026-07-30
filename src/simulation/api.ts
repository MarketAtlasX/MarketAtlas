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
} from './types'

const simApi = axios.create({
  baseURL: '/api',
  timeout: 120000,
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

export function createSimulationWebSocket(
  onMessage: (msg: WSMessage) => void,
  onConnected?: () => void
): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  const baseUrl = import.meta.env.VITE_SIMULATOR_WS_URL || `${protocol}//${host}`
  const ws = new WebSocket(`${baseUrl}/ws/simulation`)

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

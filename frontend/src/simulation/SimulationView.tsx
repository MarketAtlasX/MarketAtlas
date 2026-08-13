import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Play, StopCircle, RefreshCw, ChevronDown, ChevronUp,
  Layout, BarChart3,
} from 'lucide-react'
import ScenarioEditor from './ScenarioEditor'
import Timeline from './Timeline'
import ProbabilityTree from './ProbabilityTree'
import ImpactGraph from './ImpactGraph'
import AgentPanel from './AgentPanel'
import WorldMap from './WorldMap'
import PortfolioImpact from './PortfolioImpact'
import ConfidencePanel from './ConfidencePanel'
import ReportViewer from './ReportViewer'
import PortfolioManager from './PortfolioManager'
import {
  createSimulationRun, getSimulationRun, listSimulationRuns,
  createSimulationWebSocket,
} from './api'
import type {
  Scenario, Simulation, SimulationRunRecord, SimulationReport,
  SimulationBranch, Portfolio, PortfolioImpact as PortfolioImpactData, WSMessage,
} from './types'

type Tab = 'editor' | 'simulation' | 'report'

interface SimulationViewProps {
  initialScenarioText?: string
}

export default function SimulationView({ initialScenarioText = '' }: SimulationViewProps) {
  const [tab, setTab] = useState<Tab>('editor')
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null)
  const [currentSim, setCurrentSim] = useState<Simulation | null>(null)
  const [currentRun, setCurrentRun] = useState<SimulationRunRecord | null>(null)
  const [currentReport, setCurrentReport] = useState<SimulationReport | null>(null)
  const [branches, setBranches] = useState<SimulationBranch[]>([])
  const [portfolioImpact, setPortfolioImpact] = useState<PortfolioImpactData | null>(null)
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [runHistory, setRunHistory] = useState<SimulationRunRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const ws = createSimulationWebSocket((msg: WSMessage) => {
      if (msg.type === 'progress') {
        setProgress(`Simulating... ${msg.progress}% (T+${msg.horizon_days}d)`)
      }
      if (msg.type === 'simulation_complete') {
        setProgress('Simulation complete!')
        setTimeout(() => setProgress(null), 3000)
      }
    })
    wsRef.current = ws
    return () => { ws.close() }
  }, [])

  const handleSelectPortfolio = useCallback((p: Portfolio) => {
    setPortfolio(p)
    setTab('editor')
  }, [])

  const handleRun = useCallback(async (scenario: Scenario) => {
    if (!portfolio) {
      setError('Create or select a portfolio before running a simulation')
      return
    }
    setLoading(true)
    setError(null)
    setCurrentScenario(scenario)
    setCurrentSim(null)
    setCurrentRun(null)
    setCurrentReport(null)
    setPortfolioImpact(null)

    try {
      const run = await createSimulationRun(portfolio.id, {
        title: scenario.title,
        description: scenario.description,
        duration_days: scenario.duration_days,
        expected_uncertainty: scenario.expected_uncertainty,
        injected_events: scenario.injected_events,
        assumptions: scenario.assumptions,
        tags: scenario.tags,
      })

      if (run.status === 'failed') {
        throw new Error(run.error || 'Simulation failed')
      }

      setCurrentRun(run)
      const refreshed = await getSimulationRun(run.id)
      setCurrentRun(refreshed)
      setPortfolioImpact(refreshed.result?.portfolio_impact ?? null)

      const history = await listSimulationRuns()
      setRunHistory(history)

      setTab('simulation')
    } catch (err) {
      let msg = 'Simulation failed'
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { status?: number; data?: { detail?: string } }; message?: string }
        const status = axiosErr.response?.status
        const detail = axiosErr.response?.data?.detail
        msg = status ? `Server error (${status}): ${detail || axiosErr.message || 'unknown'}` : (axiosErr.message || msg)
      } else if (err instanceof Error) {
        msg = err.message
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [portfolio])

  const handleRefresh = useCallback(async () => {
    if (!currentRun) return
    setLoading(true)
    try {
      const run = await getSimulationRun(currentRun.id)
      setCurrentRun(run)
      setPortfolioImpact(run.result?.portfolio_impact ?? null)
    } catch { /* ignore */ }
    setLoading(false)
  }, [currentRun])

  return (
    <div className="flex h-full">
      <div className="w-48 bg-gray-900 border-r border-gray-800 p-4 flex flex-col gap-2">
        <button
          onClick={() => setTab('editor')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            tab === 'editor' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <Play className="w-4 h-4" />
          Scenario Editor
        </button>
        <button
          onClick={() => setTab('simulation')}
          disabled={!currentRun}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            tab === 'simulation' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
          } ${!currentRun ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <BarChart3 className="w-4 h-4" />
          Simulation
        </button>
        <button
          onClick={() => setTab('report')}
          disabled={!currentReport}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            tab === 'report' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
          } ${!currentReport ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Layout className="w-4 h-4" />
          Report
        </button>

        {currentRun && (
          <div className="mt-auto pt-4 border-t border-gray-800">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white w-full"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-900/50 border border-red-800 rounded-lg text-sm text-red-300">
            {error}
          </div>
        )}

        {progress && (
          <div className="mb-4 px-4 py-3 bg-blue-900/50 border border-blue-800 rounded-lg text-sm text-blue-300 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            {progress}
          </div>
        )}

        {tab === 'editor' && (
          <div className="space-y-6">
            <PortfolioManager selectedId={portfolio?.id ?? null} onSelect={handleSelectPortfolio} />
            {portfolio ? (
              <ScenarioEditor onRun={handleRun} initialText={initialScenarioText} />
            ) : (
              <p className="text-sm text-gray-500">Create or select a portfolio to get started.</p>
            )}
          </div>
        )}

        {tab === 'simulation' && currentRun && (
          <div className="space-y-8">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-900 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Status</h3>
                <span className="text-2xl font-bold text-green-400">{currentRun.status}</span>
                {portfolio && (
                  <p className="text-xs text-gray-500 mt-2">Portfolio: {portfolio.name}</p>
                )}
              </div>
              <div className="bg-gray-900 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Confidence</h3>
                <span className={`text-2xl font-bold ${
                  (currentRun.result?.chief_report?.overall_confidence ?? 0) > 0.6 ? 'text-green-400' :
                  (currentRun.result?.chief_report?.overall_confidence ?? 0) > 0.4 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {(((currentRun.result?.chief_report?.overall_confidence ?? 0)) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="bg-gray-900 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Outlook</h3>
                <span className="text-2xl font-bold text-blue-400">
                  {currentRun.result?.chief_report?.scenario_outlook || 'N/A'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {currentRun.result?.chief_report && (
                <AgentPanel chiefReport={currentRun.result.chief_report} />
              )}
              <div className="space-y-6">
                <PortfolioImpact data={portfolioImpact} />
              </div>
            </div>

            {currentRun.result?.chief_report && (
              <ImpactGraph
                impacts={currentRun.result.chief_report.agent_reports?.market?.impacts ||
                  Object.values(currentRun.result.chief_report.agent_reports).flatMap(r => r.impacts) || []}
              />
            )}
          </div>
        )}

        {tab === 'report' && (
          <ReportViewer report={currentReport} loading={loading} />
        )}
      </div>
    </div>
  )
}

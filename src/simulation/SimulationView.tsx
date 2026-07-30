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
import {
  createScenario, runSimulation, getSimulation, getReport,
  getBranches, getPortfolioImpact, listSimulations, createSimulationWebSocket,
} from './api'
import type {
  Scenario, Simulation, SimulationRun, SimulationReport,
  SimulationBranch, PortfolioSummary, WSMessage,
} from './types'

type Tab = 'editor' | 'simulation' | 'report'

export default function SimulationView() {
  const [tab, setTab] = useState<Tab>('editor')
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null)
  const [currentSim, setCurrentSim] = useState<Simulation | null>(null)
  const [currentRun, setCurrentRun] = useState<SimulationRun | null>(null)
  const [currentReport, setCurrentReport] = useState<SimulationReport | null>(null)
  const [branches, setBranches] = useState<SimulationBranch[]>([])
  const [portfolioImpact, setPortfolioImpact] = useState<PortfolioSummary | null>(null)
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

  const handleRun = useCallback(async (scenario: Scenario) => {
    setLoading(true)
    setError(null)
    setCurrentScenario(scenario)
    setCurrentSim(null)
    setCurrentRun(null)
    setCurrentReport(null)

    try {
      const created = await createScenario({
        title: scenario.title,
        description: scenario.description,
        events: scenario.injected_events.map(e => ({
          type: e.event_type,
          title: e.title,
          description: e.description,
          countries: e.countries,
          severity: e.severity,
        })),
        assumptions: Object.values(scenario.assumptions.assumptions).map(a => ({
          id: a.id,
          description: a.description,
          probability: a.probability,
          category: a.category,
          depends_on: a.depends_on,
        })),
        duration_days: scenario.duration_days,
        uncertainty: scenario.expected_uncertainty,
      })

      const result = await runSimulation(created.scenario_id)
      const sim = await getSimulation(result.simulation_id)
      setCurrentSim(sim)
      setCurrentRun(sim.runs[sim.runs.length - 1] || null)

      const report = await getReport(result.simulation_id)
      setCurrentReport(report)

      try {
        const branchData = await getBranches(result.simulation_id)
        setBranches(branchData.branches)
      } catch { /* optional */ }

      try {
        const portfolio = await getPortfolioImpact(result.simulation_id)
        setPortfolioImpact(portfolio as PortfolioSummary)
      } catch { /* optional */ }

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
  }, [])

  const handleRefresh = useCallback(async () => {
    if (!currentSim) return
    setLoading(true)
    try {
      const sim = await getSimulation(currentSim.id)
      setCurrentSim(sim)
      const report = await getReport(currentSim.id)
      setCurrentReport(report)
    } catch { /* ignore */ }
    setLoading(false)
  }, [currentSim])

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
          <ScenarioEditor onRun={handleRun} />
        )}

        {tab === 'simulation' && currentRun && (
          <div className="space-y-8">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-900 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Horizons</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(currentRun.horizon_results).map(h => (
                    <span key={h} className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-400">T+{h}d</span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">{currentRun.total_paths} Monte Carlo paths</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Confidence</h3>
                <span className={`text-2xl font-bold ${
                  currentRun.average_confidence > 0.6 ? 'text-green-400' :
                  currentRun.average_confidence > 0.4 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {(currentRun.average_confidence * 100).toFixed(0)}%
                </span>
              </div>
              <div className="bg-gray-900 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Outlook</h3>
                <span className="text-2xl font-bold text-blue-400">
                  {currentRun.chief_report.scenario_outlook}
                </span>
              </div>
            </div>

            <Timeline horizonResults={currentRun.horizon_results} />

            <ProbabilityTree branches={branches} />

            <div className="grid grid-cols-2 gap-6">
              <AgentPanel chiefReport={currentRun.chief_report} />
              <div className="space-y-6">
                <WorldMap
                  events={currentSim?.scenario.injected_events || []}
                  riskScores={Object.values(currentRun.horizon_results)[0]?.risk_scores}
                />
                <PortfolioImpact data={portfolioImpact} />
              </div>
            </div>

            <ImpactGraph
              impacts={currentRun.chief_report.agent_reports?.market?.impacts ||
                Object.values(currentRun.chief_report.agent_reports).flatMap(r => r.impacts) || []}
            />

            <ConfidencePanel run={currentRun} />
          </div>
        )}

        {tab === 'report' && (
          <ReportViewer report={currentReport} loading={loading} />
        )}
      </div>
    </div>
  )
}

import { useMemo } from 'react'
import { Shield, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import type { ConfidenceAnalysis, AgentConfidence, SimulationRun } from '../types'

interface ConfidencePanelProps {
  run: SimulationRun | null
}

export default function ConfidencePanel({ run }: ConfidencePanelProps) {
  const analysis = run?.chief_report

  const radarData = useMemo(() => {
    if (!analysis) return []
    const agents = Object.entries(analysis.agent_reports)
    return agents.map(([type, report]) => ({
      agent: type.replace(/_/g, ' '),
      confidence: report.confidence * 100,
    }))
  }, [analysis])

  const horizonData = useMemo(() => {
    if (!run) return []
    return Object.entries(run.horizon_results)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([days, result]) => ({
        days: `T+${days}d`,
        confidence: result.confidence * 100,
        uncertainty: result.uncertainty * 100,
      }))
  }, [run])

  const getConfidenceColor = (value: number) => {
    if (value >= 70) return 'text-green-400'
    if (value >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getConfidenceBg = (value: number) => {
    if (value >= 70) return 'bg-green-900 text-green-300'
    if (value >= 50) return 'bg-yellow-900 text-yellow-300'
    return 'bg-red-900 text-red-300'
  }

  if (!run) {
    return (
      <div className="text-gray-500 text-sm p-4 text-center">
        Run a simulation to see confidence analysis.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-green-500" />
        <h3 className="text-lg font-semibold text-white">Confidence Analysis</h3>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Overall', value: run.average_confidence * 100 },
          { label: 'Chief Agent', value: analysis?.overall_confidence ? analysis.overall_confidence * 100 : 0 },
          { label: 'Consensus', value: analysis?.consensus_score ? analysis.consensus_score * 100 : 0 },
          { label: 'Paths', value: run.total_paths },
        ].map(stat => (
          <div key={stat.label} className="bg-gray-900 rounded-lg p-3 text-center">
            <span className="text-2xl font-bold text-white block">{stat.value.toFixed(0)}</span>
            <span className="text-xs text-gray-500">{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 rounded-lg p-4">
          <span className="text-sm text-gray-400 mb-2 block">Agent Confidence Distribution</span>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis dataKey="agent" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#9CA3AF', fontSize: 10 }} />
              <Radar dataKey="confidence" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 rounded-lg p-4">
          <span className="text-sm text-gray-400 mb-2 block">Confidence vs Uncertainty by Horizon</span>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={horizonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="days" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              />
              <Bar dataKey="confidence" fill="#3B82F6" name="Confidence" radius={[4, 4, 0, 0]} />
              <Bar dataKey="uncertainty" fill="#EF4444" name="Uncertainty" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-4">
        <span className="text-sm text-gray-400 font-medium block mb-3">Key Uncertainties</span>
        {analysis?.key_uncertainties && analysis.key_uncertainties.length > 0 ? (
          <div className="space-y-2">
            {analysis.key_uncertainties.map((u, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <AlertTriangle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                <span className="text-gray-400">{u}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-600">No key uncertainties identified.</p>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>Rating:</span>
        <span className={`px-2 py-0.5 rounded ${getConfidenceBg(run.average_confidence * 100)}`}>
          {run.average_confidence > 0.6 ? 'High' : run.average_confidence > 0.4 ? 'Moderate' : 'Low'}
        </span>
        <span>Trend: {run.horizon_results && Object.keys(run.horizon_results).length > 1 ? 'Stable' : 'N/A'}</span>
      </div>
    </div>
  )
}

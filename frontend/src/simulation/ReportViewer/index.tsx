import { useState, useMemo } from 'react'
import {
  FileText, Download, ChevronDown, ChevronRight,
  TrendingUp, TrendingDown, Target, AlertTriangle, History,
  Brain, Shield, Globe,
} from 'lucide-react'
import type { SimulationReport } from '../types'
import ImpactGraph from '../ImpactGraph'
import AgentPanel from '../AgentPanel'

interface ReportViewerProps {
  report: SimulationReport | null
  loading?: boolean
}

type SectionKey = 'summary' | 'timeline' | 'agents' | 'confidence' | 'portfolio' | 'reasoning' | 'analogues' | 'actions'

const SECTIONS: { key: SectionKey; label: string; icon: typeof FileText }[] = [
  { key: 'summary', label: 'Scenario Summary', icon: FileText },
  { key: 'timeline', label: 'Timeline', icon: TrendingUp },
  { key: 'agents', label: 'Agent Reports', icon: Brain },
  { key: 'confidence', label: 'Confidence', icon: Shield },
  { key: 'portfolio', label: 'Portfolio Impact', icon: TrendingDown },
  { key: 'reasoning', label: 'Reasoning Graph', icon: Globe },
  { key: 'analogues', label: 'Historical Analogues', icon: History },
  { key: 'actions', label: 'Recommended Actions', icon: Target },
]

export default function ReportViewer({ report, loading }: ReportViewerProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true,
  })

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const allImpacts = useMemo(() => {
    if (!report) return []
    const impacts = []
    for (const agentReport of Object.values(report.agent_reports)) {
      impacts.push(...agentReport.impacts)
    }
    return impacts
  }, [report])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Generating simulation report...</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="text-gray-500 text-sm p-4 text-center">
        No report available. Run a simulation to generate a report.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          <h2 className="text-xl font-semibold text-white">Simulation Report</h2>
        </div>
        <span className="text-xs text-gray-500">
          Generated {new Date(report.generated_at).toLocaleString()}
        </span>
      </div>

      <div className="space-y-2">
        {SECTIONS.map(({ key, label, icon: Icon }) => {
          const isExpanded = expandedSections[key]
          return (
            <div key={key} className="border border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection(key)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-750 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-white">{label}</span>
                </div>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </button>

              {isExpanded && (
                <div className="px-4 py-3 bg-gray-900">
                  {key === 'summary' && (
                    <div className="space-y-2">
                      <h3 className="text-base font-medium text-white">{report.scenario_summary.title}</h3>
                      <p className="text-sm text-gray-400">{report.scenario_summary.description}</p>
                      <div className="grid grid-cols-4 gap-3 mt-3">
                        <div className="bg-gray-800 rounded-lg p-2 text-center">
                          <span className="text-lg font-bold text-white block">{report.scenario_summary.duration_days}</span>
                          <span className="text-xs text-gray-500">Days</span>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-2 text-center">
                          <span className="text-lg font-bold text-white block">{report.scenario_summary.event_count}</span>
                          <span className="text-xs text-gray-500">Events</span>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-2 text-center">
                          <span className="text-lg font-bold text-white block">{report.scenario_summary.assumption_count}</span>
                          <span className="text-xs text-gray-500">Assumptions</span>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-2 text-center">
                          <span className="text-lg font-bold text-white block">{report.chief_assessment.scenario_outlook}</span>
                          <span className="text-xs text-gray-500">Outlook</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {key === 'timeline' && report.timeline.horizon_count > 0 && (
                    <div className="space-y-2">
                      {Object.entries(report.timeline.details).map(([days, detail]) => (
                        <div key={days} className="flex items-center justify-between py-1 border-b border-gray-800 last:border-0">
                          <span className="text-sm text-gray-300">T+{days}d</span>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-gray-500">Conf: {(detail.confidence * 100).toFixed(0)}%</span>
                            <span className="text-xs text-gray-500">Unc: {(detail.uncertainty * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {key === 'agents' && (
                    <AgentPanel
                      chiefReport={{
                        summary: report.chief_assessment.summary,
                        overall_confidence: report.chief_assessment.overall_confidence,
                        consensus_score: report.chief_assessment.consensus_score,
                        key_uncertainties: report.chief_assessment.key_uncertainties,
                        scenario_outlook: report.chief_assessment.scenario_outlook,
                        recommended_actions: report.chief_assessment.recommended_actions,
                        sector_winners: report.chief_assessment.sector_winners,
                        sector_losers: report.chief_assessment.sector_losers,
                        reasoning_synthesis: {},
                        agent_reports: Object.fromEntries(
                          Object.entries(report.agent_reports).map(([k, v]) => [k, {
                            agent_type: k,
                            agent_name: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                            summary: v.summary,
                            impacts: v.impacts,
                            confidence: v.confidence,
                            key_risks: v.key_risks,
                            key_opportunities: v.key_opportunities,
                            assumptions_used: [],
                            reasoning_graph: {},
                          }])
                        ),
                      }}
                    />
                  )}

                  {key === 'confidence' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-800 rounded-lg p-3">
                          <span className="text-xs text-gray-500">Overall</span>
                          <span className="text-xl font-bold text-white block">{(report.confidence_analysis.overall_confidence * 100).toFixed(0)}%</span>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-3">
                          <span className="text-xs text-gray-500">Rating</span>
                          <span className="text-xl font-bold text-white block capitalize">{report.confidence_analysis.confidence_rating.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        MC Confidence: {(report.confidence_analysis.mc_confidence * 100).toFixed(0)}% |
                        Consensus: {(report.confidence_analysis.consensus_score * 100).toFixed(0)}% |
                        Trend: {report.confidence_analysis.uncertainty_trend}
                      </div>
                    </div>
                  )}

                  {key === 'portfolio' && report.portfolio_impact && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400">{report.portfolio_impact.summary || report.portfolio_impact.note || 'No detailed portfolio analysis available.'}</p>
                      {report.portfolio_impact.risks && (
                        <div>
                          <span className="text-xs text-red-400 font-medium">Risks:</span>
                          <ul className="mt-1 space-y-0.5">
                            {report.portfolio_impact.risks.slice(0, 4).map((r, i) => (
                              <li key={i} className="text-xs text-gray-500">{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {key === 'reasoning' && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400">
                        {report.reasoning_graph?.chains
                          ? `${Object.keys(report.reasoning_graph.chains).length} causal chains in reasoning graph`
                          : 'Reasoning graph available in API response.'}
                      </p>
                    </div>
                  )}

                  {key === 'analogues' && (
                    <div className="space-y-2">
                      {report.historical_analogues.map((analogue, i) => (
                        <div key={i} className="bg-gray-800 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-white">{analogue.event}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              analogue.similarity === 'high' ? 'bg-blue-900 text-blue-300' :
                              analogue.similarity === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                              'bg-gray-700 text-gray-400'
                            }`}>
                              {analogue.similarity}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{analogue.relevance}</p>
                          <p className="text-xs text-gray-600 mt-1">{analogue.market_impact}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {key === 'actions' && (
                    <div className="space-y-2">
                      {report.recommended_actions.map((action, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Target className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-300">{action}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {allImpacts.length > 0 && (
        <ImpactGraph impacts={allImpacts} title="Aggregate Impact Summary" />
      )}
    </div>
  )
}

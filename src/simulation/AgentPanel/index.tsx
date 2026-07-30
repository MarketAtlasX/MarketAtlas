import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Brain, AlertTriangle, Target } from 'lucide-react'
import type { ChiefReport, AgentReport } from '../types'

interface AgentPanelProps {
  chiefReport: ChiefReport | null
}

const AGENT_ICONS: Record<string, string> = {
  conflict: '\u2694\uFE0F',
  economic: '\uD83D\uDCCA',
  supply_chain: '\uD83D\uDD17',
  energy: '\u26A1',
  trade: '\uD83D\uDEEB\uFE0F',
  cyber: '\uD83D\uDD10',
  market: '\uD83D\uDCC8',
  portfolio: '\uD83D\uDCC1',
}

export default function AgentPanel({ chiefReport }: AgentPanelProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const toggleAgent = (agentType: string) => {
    setExpanded(prev => ({ ...prev, [agentType]: !prev[agentType] }))
  }

  const sortedAgents = useMemo(() => {
    if (!chiefReport) return []
    return Object.entries(chiefReport.agent_reports).sort(
      ([, a], [, b]) => b.confidence - a.confidence
    )
  }, [chiefReport])

  if (!chiefReport) {
    return (
      <div className="text-gray-500 text-sm p-4 text-center">
        No agent reports available. Run a simulation first.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-purple-500" />
        <h3 className="text-lg font-semibold text-white">AI Agent Analysis</h3>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-purple-400">Chief Intelligence</span>
          <span className={`text-xs px-2 py-0.5 rounded ${
            chiefReport.overall_confidence > 0.6 ? 'bg-green-900 text-green-300' :
            chiefReport.overall_confidence > 0.4 ? 'bg-yellow-900 text-yellow-300' :
            'bg-red-900 text-red-300'
          }`}>
            {(chiefReport.overall_confidence * 100).toFixed(0)}% confidence
          </span>
        </div>
        <p className="text-sm text-gray-300">{chiefReport.summary}</p>
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
          <span>Outlook: {chiefReport.scenario_outlook}</span>
          <span>Consensus: {(chiefReport.consensus_score * 100).toFixed(0)}%</span>
        </div>
        {chiefReport.recommended_actions.length > 0 && (
          <div className="mt-3">
            <span className="text-xs text-gray-400 font-medium">Recommended Actions:</span>
            <ul className="mt-1 space-y-1">
              {chiefReport.recommended_actions.map((action, i) => (
                <li key={i} className="text-xs text-gray-500 flex items-start gap-1">
                  <Target className="w-3 h-3 mt-0.5 text-blue-400 flex-shrink-0" />
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {sortedAgents.map(([agentType, report]) => {
          const isExpanded = expanded[agentType]
          return (
            <div key={agentType} className="border border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleAgent(agentType)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-750 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{AGENT_ICONS[agentType] || '\uD83E\uDD16'}</span>
                  <span className="text-sm text-white">{report.agent_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    report.confidence > 0.6 ? 'bg-green-900 text-green-300' :
                    report.confidence > 0.4 ? 'bg-yellow-900 text-yellow-300' :
                    'bg-red-900 text-red-300'
                  }`}>
                    {(report.confidence * 100).toFixed(0)}%
                  </span>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 py-3 bg-gray-900 space-y-3">
                  <p className="text-xs text-gray-400">{report.summary}</p>

                  {report.impacts.length > 0 && (
                    <div>
                      <span className="text-xs text-gray-500 font-medium">Impacts:</span>
                      <div className="mt-1 space-y-1">
                        {report.impacts.map((impact, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">{impact.name.replace(/_/g, ' ')}</span>
                            <span className={`font-mono ${
                              impact.value > 0 ? 'text-green-400' : impact.value < 0 ? 'text-red-400' : 'text-gray-400'
                            }`}>
                              {impact.value > 0 ? '+' : ''}{impact.value.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 text-xs">
                    {report.key_risks.length > 0 && (
                      <div className="flex-1">
                        <span className="text-red-400 font-medium">Risks:</span>
                        <ul className="mt-1 space-y-0.5">
                          {report.key_risks.slice(0, 3).map((r, i) => (
                            <li key={i} className="text-gray-500 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5 text-red-500" />
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {report.key_opportunities.length > 0 && (
                      <div className="flex-1">
                        <span className="text-green-400 font-medium">Opportunities:</span>
                        <ul className="mt-1 space-y-0.5">
                          {report.key_opportunities.slice(0, 3).map((o, i) => (
                            <li key={i} className="text-gray-500">{o}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

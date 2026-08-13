import { useWorldStore } from '../../stores/WorldStore'
import { AGENT_DEFINITIONS, agentColor } from '../agents/agents'
import StatusDot from '../../components/ui/StatusDot'

export default function AgentStatusMatrix() {
  const { state } = useWorldStore()
  const avgConsensus = Math.round(state.agents.reduce((s, a) => s + a.consensus, 0) / Math.max(1, state.agents.length))

  return (
    <div className="h-full flex flex-col p-3 gap-2 overflow-y-auto">
      <div className="flex items-center justify-between px-1">
        <span className="panel-title">AI Network</span>
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-mid)]">
          Consensus
          <span className="font-mono font-semibold text-[var(--positive)]">{avgConsensus}%</span>
        </div>
      </div>

      <div className="space-y-1.5">
        {state.agents.map(agent => {
          const def = AGENT_DEFINITIONS.find(a => a.name === agent.name)
          const isAnalyzing = agent.state === 'analyzing'
          const hasInsight = agent.state === 'insight' || agent.lastInsight
          return (
            <div
              key={agent.name}
              className="flex items-center gap-2 rounded border border-[var(--line)] bg-[rgba(11,22,33,0.5)] px-2.5 py-1.5"
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: agentColor(agent.name), boxShadow: `0 0 6px ${agentColor(agent.name)}` }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-[var(--text-hi)]">{agent.name}</span>
                  <span className="text-[9px] font-mono" style={{ color: agentColor(agent.name) }}>
                    {isAnalyzing ? 'ANALYZING...' : hasInsight ? 'NEW INSIGHT' : 'ACTIVE'}
                  </span>
                </div>
                <p className="text-[9px] text-[var(--text-lo)] truncate">{def?.role}</p>
              </div>
              <StatusDot tone={isAnalyzing ? 'warning' : 'positive'} pulse={isAnalyzing} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

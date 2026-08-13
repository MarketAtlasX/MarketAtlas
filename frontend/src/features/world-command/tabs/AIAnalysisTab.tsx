import { Sparkles, AlertTriangle, TrendingUp } from 'lucide-react'
import { useWorldStore } from '../../../stores/WorldStore'
import { AGENT_DEFINITIONS, agentColor } from '../../agents/agents'
import Badge from '../../../components/ui/Badge'

const INSIGHT_POOL = [
  { tone: 'critical', text: 'Strait of Hormuz transit insurance premiums up 18% — energy risk rising.', agent: 'Risk' },
  { tone: 'warning', text: 'Rare earth export licenses tightened; semiconductor input costs +4.1%.', agent: 'Supply Chain' },
  { tone: 'positive', text: 'Chip export momentum strongest in 24 months — AI demand tailwind.', agent: 'Market' },
] as const

export default function AIAnalysisTab() {
  const { state } = useWorldStore()

  const insights = [
    ...state.agents
      .filter(a => a.lastInsight)
      .map(a => ({ tone: 'accent' as const, text: a.lastInsight!, agent: a.name })),
    ...INSIGHT_POOL,
  ].slice(0, 5)

  return (
    <div className="h-full flex gap-3 overflow-x-auto">
      {insights.map((ins, i) => {
        const def = AGENT_DEFINITIONS.find(a => a.name === ins.agent)
        const icon =
          ins.tone === 'critical' ? <AlertTriangle size={13} /> : ins.tone === 'positive' ? <TrendingUp size={13} /> : <Sparkles size={13} />
        return (
          <div key={i} className="stream-in flex-shrink-0 w-72 flex flex-col gap-2 rounded border border-[var(--line)] bg-[rgba(11,22,33,0.55)] p-3">
            <div className="flex items-center gap-2">
              <span
                className="flex h-6 w-6 items-center justify-center rounded"
                style={{ background: `${agentColor(ins.agent)}18`, color: agentColor(ins.agent) }}
              >
                {icon}
              </span>
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-hi)]">{ins.agent}</p>
                <p className="text-[8px] uppercase tracking-widest text-[var(--text-lo)] font-mono">agent insight</p>
              </div>
              <Badge tone={ins.tone === 'critical' ? 'critical' : ins.tone === 'positive' ? 'positive' : 'accent'} className="ml-auto">
                {ins.tone.toUpperCase()}
              </Badge>
            </div>
            <p className="text-[11px] leading-snug text-[var(--text-mid)]">{ins.text}</p>
            <p className="mt-auto text-[9px] font-mono text-[var(--text-lo)]">
              confidence {def ? 74 + Math.round(def.name.length * 2) : 82}%
            </p>
          </div>
        )
      })}
    </div>
  )
}

import { useWorldStore } from '../../../stores/WorldStore'
import type { LiveEventType } from '../../../types'
import Badge from '../../../components/ui/Badge'
import StatusDot from '../../../components/ui/StatusDot'

const TYPE_TONE: Record<LiveEventType, 'critical' | 'warning' | 'accent' | 'positive' | 'neutral'> = {
  conflict: 'critical',
  military: 'critical',
  sanction: 'warning',
  trade: 'positive',
  diplomatic: 'accent',
  economic: 'neutral',
  election: 'accent',
  natural: 'warning',
  market: 'positive',
}

export default function LiveEventsTab() {
  const { state } = useWorldStore()

  return (
    <div className="h-full flex gap-2 overflow-x-auto">
      {state.events.slice(0, 14).map(e => {
        const t = new Date(e.timestamp).getTime()
        const mins = Math.max(0, Math.round((Date.now() - t) / 60000))
        return (
          <div
            key={e.id}
            className="stream-in flex-shrink-0 w-64 rounded border border-[var(--line)] bg-[rgba(11,22,33,0.55)] p-2.5 flex flex-col justify-between"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Badge tone={TYPE_TONE[e.type]}>{e.type.toUpperCase()}</Badge>
              <span className="ml-auto flex items-center gap-1 text-[9px] font-mono text-[var(--text-lo)]">
                <StatusDot tone={e.severity >= 7 ? 'critical' : e.severity >= 5 ? 'warning' : 'accent'} pulse={e.severity >= 7} />
                {mins < 1 ? 'NOW' : `${mins}m`}
              </span>
            </div>
            <p className="text-[11px] leading-snug text-[var(--text-hi)] line-clamp-3">{e.title}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[9px] font-mono text-[var(--text-lo)] uppercase tracking-wider">{e.country}</span>
              <span className="text-[9px] font-mono" style={{ color: e.severity >= 7 ? 'var(--critical)' : 'var(--warning)' }}>
                SEV {e.severity}/10
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

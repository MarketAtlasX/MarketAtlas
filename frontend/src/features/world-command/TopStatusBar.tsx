import { useWorldStore } from '../../stores/WorldStore'
import StatusDot from '../../components/ui/StatusDot'
import { useClock, formatCommandTime } from '../../hooks/useClock'
import { riskColor } from '../../stores/WorldStore'

export default function TopStatusBar() {
  const { state } = useWorldStore()
  const now = useClock()
  const risk = state.worldRisk

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-5 border-b border-[var(--line)] bg-[var(--bg-raised)] relative z-20">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 bg-[var(--accent)]" />
          <span className="text-[13px] font-semibold tracking-[0.22em] text-[var(--text-hi)]">
            MARKET<span className="text-[var(--accent)] text-glow">ATLAS</span>
          </span>
        </div>
          <span className="hidden md:inline text-[10px] uppercase tracking-[0.16em] text-[var(--text-lo)] font-mono">
          Geopolitical Intelligence
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-2.5 py-1.5 border border-[rgba(46,230,168,0.3)] bg-[rgba(46,230,168,0.06)]">
          <StatusDot tone="positive" />
          <span className="text-[11px] font-semibold tracking-[0.2em] text-[var(--positive)]">LIVE</span>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1.5 border border-[var(--line)]">
          <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-mid)]">World Risk</span>
          <span
            className="font-mono text-sm font-bold"
            style={{ color: riskColor(risk.score), textShadow: `0 0 10px ${riskColor(risk.score)}55` }}
          >
            {risk.score.toFixed(1)}
          </span>
          <span className="text-[9px] uppercase tracking-widest" style={{ color: riskColor(risk.score) }}>
            {risk.level}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--text-mid)]">
          <StatusDot tone="accent" pulse={false} />
          <span>{formatCommandTime(now).toUpperCase()}</span>
        </div>
      </div>
    </header>
  )
}

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowUp, ArrowDown, Target } from 'lucide-react'
import { useWorldStore, countryName } from '../../stores/WorldStore'
import { worldStates } from '../../data/worldState'
import Gauge from '../../components/ui/Gauge'
import Badge from '../../components/ui/Badge'
import Panel from '../../components/ui/Panel'
import ProgressBar from '../../components/ui/ProgressBar'

const RELATED_SIGNALS: Record<string, string[]> = {
  Iran: ['XOM', 'SHEL', 'GC'],
  Taiwan: ['NVDA', 'TSMC', 'AAPL'],
  China: ['AAPL', 'NVDA', 'GC'],
  Russia: ['XOM', 'SHEL', 'GC'],
  US: ['NVDA', 'AAPL', 'GC'],
  Ukraine: ['SHEL', 'XOM', 'GC'],
}

export default function IntelligencePanel() {
  const { state } = useWorldStore()
  const navigate = useNavigate()

  const entity = state.selectedEntity ?? 'Iran'
  const ws = worldStates.find(w => w.name === entity)
  const risk = ws ? ws.riskScore : 82
  const liveEvents = useMemo(
    () =>
      state.events
        .filter(e => e.country === entity || e.countryCode === entity)
        .slice(0, 4),
    [state.events, entity],
  )
  const fallbackEvents = useMemo(() => state.events.slice(0, 4), [state.events])
  const activeEvents = liveEvents.length > 0 ? liveEvents : fallbackEvents

  const related = RELATED_SIGNALS[entity] ?? ['NVDA', 'XOM', 'GC']
  const signals = useMemo(
    () => state.signals.filter(s => related.includes(s.symbol)).slice(0, 4),
    [state.signals, related],
  )

  const riskColor = risk >= 75 ? '#ff4d5e' : risk >= 55 ? '#f5b941' : '#38e8ff'

  return (
    <div className="h-full flex flex-col gap-3 p-3 overflow-y-auto">
      <Panel
        title={entity}
        right={<Badge tone={risk >= 75 ? 'critical' : risk >= 55 ? 'warning' : 'positive'}>GEOPOLITICAL</Badge>}
        glow={risk >= 75 ? 'critical' : undefined}
        corners
      >
        <div className="flex items-center gap-4">
          <Gauge value={risk} max={100} sub="/100" color={riskColor} size={92} label="Geopolitical Risk" />
          <div className="flex-1 space-y-2">
            {state.worldRisk.drivers.slice(0, 3).map(d => (
              <div key={d.entity}>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-[var(--text-mid)]">{d.entity}</span>
                  <span className="font-mono text-[var(--text-hi)]">{d.score}</span>
                </div>
                <ProgressBar value={d.score} />
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel title="Active Events">
        <div className="space-y-2">
          {activeEvents.map(e => (
            <div key={e.id} className="flex items-start gap-2 group">
              <span
                className="mt-1 h-1.5 w-1.5 rounded-full shrink-0"
                style={{
                  background: e.severity >= 7 ? 'var(--critical)' : e.severity >= 5 ? 'var(--warning)' : 'var(--accent)',
                  boxShadow: e.severity >= 7 ? 'var(--glow-critical)' : 'var(--glow-accent)',
                }}
              />
              <div className="min-w-0">
                <p className="text-[11px] leading-snug text-[var(--text-hi)]">{e.title}</p>
                <p className="text-[9px] font-mono text-[var(--text-lo)] mt-0.5">
                  {countryName(e.countryCode)} · SEV {e.severity}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Market Impact">
        <div className="space-y-2">
          {signals.map(s => (
            <div key={s.symbol} className="flex items-center gap-2 text-[11px]">
              <span className="w-12 font-mono font-semibold text-[var(--text-hi)]">{s.symbol}</span>
              <span
                className="flex items-center gap-0.5 font-mono"
                style={{ color: s.direction === 'UP' ? 'var(--positive)' : 'var(--critical)' }}
              >
                {s.direction === 'UP' ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                {s.changePct > 0 ? '+' : ''}
                {s.changePct.toFixed(1)}%
              </span>
              <span className="ml-auto flex items-center gap-1 text-[10px] text-[var(--text-lo)]">
                <Target size={10} className="text-[var(--accent)]" />
                {(s.confidence * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/graph')}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-md border border-[rgba(56,232,255,0.3)] bg-[rgba(56,232,255,0.08)] py-2 text-[10px] font-semibold tracking-[0.15em] text-[var(--accent)] hover:bg-[rgba(56,232,255,0.16)] transition-colors"
        >
          VIEW REASONING GRAPH <ArrowRight size={12} />
        </button>
      </Panel>
    </div>
  )
}

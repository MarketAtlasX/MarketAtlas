import { ChevronLeft, Mic, MicOff, RadioTower } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useWorldStore } from '../../stores/WorldStore'
import StatusDot from '../../components/ui/StatusDot'
import { useClock, formatCommandTime } from '../../hooks/useClock'
import { riskColor } from '../../stores/WorldStore'
import { useAssistantState } from '../../assistant/state/AssistantStateContext'
import { useVoiceAssistant } from '../../assistant/voice/useVoiceAssistant'
import { ASSISTANT_STATE_TONE } from '../../assistant/state/assistantState'

export default function TopStatusBar() {
  const { state: worldState } = useWorldStore()
  const location = useLocation()
  const navigate = useNavigate()
  const now = useClock()
  const risk = worldState.worldRisk
  const isDashboard = location.pathname === '/dashboard'

  const { state, overlayOpen, setOverlayOpen } = useAssistantState()
  const { active, wake, wakeEnabled, setWakeEnabled, start, stop } = useVoiceAssistant()
  const tone = ASSISTANT_STATE_TONE[state]
  const wakeStandby = !active && (wake === 'listening')
  const dotTone = active ? tone : wakeStandby ? 'var(--accent)' : 'var(--text-lo)'

  const handleBack = () => {
    const idx = typeof window !== 'undefined' ? window.history.state?.idx : undefined
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1)
      return
    }
    navigate('/dashboard')
  }

  const toggleAtlas = () => {
    if (!overlayOpen) {
      setOverlayOpen(true)
      if (!active) void start()
    } else {
      setOverlayOpen(false)
      if (active) stop()
    }
  }

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-5 border-b border-[var(--line)] bg-[var(--bg-raised)] relative z-20">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 rounded border border-transparent px-2 py-1 -ml-2 text-left transition-colors hover:border-[rgba(56,232,255,0.18)] hover:bg-[rgba(56,232,255,0.08)]"
          title="Go to dashboard"
          aria-label="Go to dashboard"
        >
          <span className="h-2.5 w-2.5 bg-[var(--accent)]" />
          <span className="text-[13px] font-semibold tracking-[0.22em] text-[var(--text-hi)]">
            MARKET<span className="text-[var(--accent)] text-glow">ATLAS</span>
          </span>
        </button>
        {!isDashboard && (
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 rounded border border-[var(--line)] bg-[rgba(6,12,18,0.72)] px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--text-mid)] transition-colors hover:border-[rgba(56,232,255,0.3)] hover:text-[var(--accent)]"
            title="Go back"
          >
            <ChevronLeft size={12} />
            Back
          </button>
        )}
        <span className="hidden md:inline text-[10px] uppercase tracking-[0.16em] text-[var(--text-lo)] font-mono">
          Geopolitical Intelligence
        </span>
      </div>

      <div className="flex items-center gap-3">
        {worldState.dataMode === 'live' ? (
          <div className="flex items-center gap-2 px-2.5 py-1.5 border border-[rgba(46,230,168,0.3)] bg-[rgba(46,230,168,0.06)]">
            <StatusDot tone="positive" />
            <span className="text-[11px] font-semibold tracking-[0.2em] text-[var(--positive)]">LIVE</span>
          </div>
        ) : (
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 border border-[rgba(245,185,65,0.3)] bg-[rgba(245,185,65,0.06)]"
            title="No live feed connected — showing offline simulated data"
          >
            <StatusDot tone="warning" pulse={false} />
            <span className="text-[11px] font-semibold tracking-[0.2em] text-[var(--warning)]">SIMULATED</span>
          </div>
        )}

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

        {/* Atlas AI voice button — persistent across all pages */}
        <button
          type="button"
          onClick={toggleAtlas}
          title={
            overlayOpen
              ? 'Close Atlas AI'
              : wakeStandby
                ? 'Always on — say "Hey Atlas" to speak'
                : 'Open Atlas AI voice control'
          }
          aria-label={overlayOpen ? 'Close Atlas AI' : 'Open Atlas AI'}
          className={`atlas-topbar-btn relative flex items-center gap-2 rounded border px-3 py-1.5 text-[10px] font-mono tracking-[0.2em] transition-all duration-200 ${
            overlayOpen || active
              ? 'border-[rgba(56,232,255,0.55)] bg-[rgba(56,232,255,0.1)] text-[var(--accent)] shadow-[0_0_14px_rgba(56,232,255,0.2)]'
              : wakeStandby
                ? 'border-[rgba(56,232,255,0.35)] bg-[rgba(56,232,255,0.05)] text-[var(--accent)]'
                : 'border-[var(--line)] text-[var(--text-mid)] hover:border-[rgba(56,232,255,0.4)] hover:text-[var(--accent)] hover:bg-[rgba(56,232,255,0.07)]'
          }`}
        >
          {/* State indicator dot */}
          <span className="relative inline-flex h-1.5 w-1.5">
            {(active || wakeStandby) && (
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-60"
                style={{ background: dotTone, animation: 'pulse-dot 1.6s ease-in-out infinite' }}
              />
            )}
            <span
              className="relative inline-flex rounded-full h-1.5 w-1.5"
              style={{ background: dotTone }}
            />
          </span>
          {wakeEnabled && !active && wakeStandby ? (
            <RadioTower size={11} className="animate-pulse" />
          ) : overlayOpen || active ? (
            <MicOff size={11} />
          ) : (
            <Mic size={11} />
          )}
          <span className="hidden sm:inline">{wakeStandby ? 'WAKE' : 'ATLAS AI'}</span>
        </button>
      </div>
    </header>
  )
}

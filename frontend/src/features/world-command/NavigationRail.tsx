import { NavLink, useNavigate } from 'react-router-dom'
import { Globe, TrendingUp, Network, FlaskConical, Database, Radio, Bot, Orbit } from 'lucide-react'
import { useWorldStore } from '../../stores/WorldStore'
import StatusDot from '../../components/ui/StatusDot'
import { useAssistantState } from '../../assistant/state/AssistantStateContext'
import { useVoiceAssistant } from '../../assistant/voice/useVoiceAssistant'

interface RailItem {
  label: string
  icon: React.ReactNode
  to?: string
  action?: () => void
  isAtlas?: boolean
}

export default function NavigationRail() {
  const { state: worldState, selectEntity } = useWorldStore()
  const navigate = useNavigate()
  const { overlayOpen, setOverlayOpen, state: assistantState } = useAssistantState()
  const { active, wake, start, stop } = useVoiceAssistant()
  const wakeStandby = !active && wake === 'listening'

  const toggleAtlas = () => {
    if (!overlayOpen) {
      setOverlayOpen(true)
      if (!active) void start()
    } else {
      setOverlayOpen(false)
      if (active) stop()
    }
  }

  const items: RailItem[] = [
    { label: 'WORLD', icon: <Globe size={14} />, to: '/dashboard' },
    { label: 'MARKETS', icon: <TrendingUp size={14} />, to: '/markets' },
    { label: 'EVENTS', icon: <Radio size={14} />, action: () => navigate('/dashboard?tab=events') },
    { label: 'GRAPH', icon: <Network size={14} />, to: '/graph' },
    { label: 'SIMULATOR', icon: <FlaskConical size={14} />, to: '/simulator' },
    { label: 'MEMORY', icon: <Database size={14} />, to: '/memory' },
    { label: 'AGENTS', icon: <Bot size={14} />, action: () => navigate('/dashboard?tab=agents') },
    { label: 'ATLAS', icon: <Orbit size={14} />, action: toggleAtlas, isAtlas: true },
  ]

  const analyzing = worldState.agents.filter(a => a.state === 'analyzing').length

  return (
    <nav className="w-16 shrink-0 flex flex-col items-center gap-1 py-3 border-r border-[var(--line)] bg-[var(--bg-raised)]">
      {items.map(item => {
        const isAtlasActive = item.isAtlas && (overlayOpen || active)

        const inner = (
          <>
            <span className="relative">
              {item.icon}
              {item.label === 'AGENTS' && analyzing > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-60 pulse-dot" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
                </span>
              )}
              {item.isAtlas && active && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--positive)] opacity-70 pulse-dot" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--positive)]" />
                </span>
              )}
              {item.isAtlas && !active && wakeStandby && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-50 pulse-dot" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
                </span>
              )}
            </span>
            <span className="text-[8px] font-medium tracking-[0.14em]">{item.label}</span>
          </>
        )

        const baseCls =
          'w-14 h-11 flex flex-col items-center justify-center gap-1 border border-transparent transition-colors'

        if (item.action) {
          const activeCls = isAtlasActive
            ? 'text-[var(--accent)] border-[rgba(56,232,255,0.35)] bg-[rgba(56,232,255,0.1)] shadow-[0_0_12px_rgba(56,232,255,0.15)]'
            : 'text-[var(--text-lo)] hover:text-[var(--text-hi)] hover:bg-[rgba(97,199,182,0.08)] hover:border-[rgba(97,199,182,0.2)]'
          return (
            <button
              key={item.label}
              className={`${baseCls} ${activeCls}`}
              onClick={item.action}
              title={item.label}
            >
              {inner}
            </button>
          )
        }
        return (
          <NavLink
            key={item.label}
            to={item.to!}
            title={item.label}
            className={({ isActive }) =>
              `${baseCls} ${
                isActive
                  ? 'text-[var(--accent)] border-[rgba(97,199,182,0.28)] bg-[rgba(97,199,182,0.1)]'
                  : 'text-[var(--text-lo)] hover:text-[var(--text-hi)] hover:bg-[rgba(97,199,182,0.08)] hover:border-[rgba(97,199,182,0.2)]'
              }`
            }
          >
            {inner}
          </NavLink>
        )
      })}

      <div className="mt-auto pt-3 border-t border-[var(--line)] w-full flex flex-col items-center gap-2">
        <button
          onClick={() => selectEntity(null)}
          className="w-12 h-9 flex items-center justify-center rounded border border-[var(--line)] text-[var(--text-lo)] hover:text-[var(--accent)] hover:border-[rgba(56,232,255,0.3)] transition-colors"
          title="Reset globe"
        >
          <span className="text-[9px] font-mono tracking-wider">RST</span>
        </button>
      </div>
    </nav>
  )
}

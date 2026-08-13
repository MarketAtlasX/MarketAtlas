import { NavLink, useNavigate } from 'react-router-dom'
import { Globe, TrendingUp, Network, FlaskConical, Database, Radio, Bot } from 'lucide-react'
import { useWorldStore } from '../../stores/WorldStore'
import StatusDot from '../../components/ui/StatusDot'

interface RailItem {
  label: string
  icon: React.ReactNode
  to?: string
  action?: () => void
}

export default function NavigationRail() {
  const { state, selectEntity } = useWorldStore()
  const navigate = useNavigate()

  const items: RailItem[] = [
    { label: 'WORLD', icon: <Globe size={14} />, to: '/dashboard' },
    { label: 'MARKETS', icon: <TrendingUp size={14} />, to: '/markets' },
    { label: 'EVENTS', icon: <Radio size={14} />, action: () => navigate('/dashboard?tab=events') },
    { label: 'GRAPH', icon: <Network size={14} />, to: '/graph' },
    { label: 'SIMULATOR', icon: <FlaskConical size={14} />, to: '/simulator' },
    { label: 'MEMORY', icon: <Database size={14} />, to: '/memory' },
    { label: 'AGENTS', icon: <Bot size={14} />, action: () => navigate('/dashboard?tab=agents') },
  ]

  const analyzing = state.agents.filter(a => a.state === 'analyzing').length

  return (
    <nav className="w-14 lg:w-16 shrink-0 flex flex-col items-center gap-1.5 py-3 border-r border-[var(--line)] bg-[rgba(4,8,12,0.85)] backdrop-blur-md">
      {items.map(item => {
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
            </span>
            <span className="text-[8px] font-medium tracking-[0.14em]">{item.label}</span>
          </>
        )

        const cls =
          'w-12 h-12 flex flex-col items-center justify-center gap-1 rounded-lg border border-transparent transition-colors text-[var(--text-lo)] hover:text-[var(--text-hi)] hover:bg-[rgba(56,232,255,0.06)] hover:border-[rgba(56,232,255,0.2)]'

        if (item.action) {
          return (
            <button key={item.label} className={cls} onClick={item.action} title={item.label}>
              {inner}
            </button>
          )
        }
        return (
          <NavLink
            key={item.label}
            to={item.to!}
            className={({ isActive }) =>
              `${cls} ${isActive ? 'text-[var(--accent)] border-[rgba(56,232,255,0.25)] bg-[rgba(56,232,255,0.08)]' : ''}`
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

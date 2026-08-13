import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import TopStatusBar from './TopStatusBar'
import NavigationRail from './NavigationRail'
import IntelligencePanel from './IntelligencePanel'
import AgentStatusMatrix from './AgentStatusMatrix'
import CommandConsole, { type ConsoleTab } from './CommandConsole'
import HolographicGlobe, { type GlobeMode } from '../globe/HolographicGlobe'
import { useWorldStore } from '../../stores/WorldStore'
import { useLiveWorldSocket } from '../../services/websocket/useLiveWorldSocket'
import Tabs from '../../components/ui/Tabs'

const GLOBE_MODES: { key: GlobeMode; label: string }[] = [
  { key: 'world', label: 'WORLD' },
  { key: 'risk', label: 'RISK' },
  { key: 'supply', label: 'SUPPLY' },
  { key: 'events', label: 'EVENTS' },
]

function tabFromParam(p: string | null): ConsoleTab {
  if (p === 'events' || p === 'propagation' || p === 'analysis' || p === 'memory' || p === 'command') return p
  return 'events'
}

export default function WorldCommandCenter() {
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<GlobeMode>('world')
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>(() => tabFromParam(searchParams.get('tab')))
  const { state, selectEntity } = useWorldStore()

  useLiveWorldSocket()

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t) setConsoleTab(tabFromParam(t))
  }, [searchParams])

  const showAgents = searchParams.get('tab') === 'agents'

  const handleGlobeSelect = (entity: string) => {
    selectEntity(entity)
    setConsoleTab('events')
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-command overflow-hidden">
      <TopStatusBar />

      <main className="flex flex-1 min-h-0">
        <NavigationRail />

        <section className="flex-1 relative min-w-0 flex flex-col">
          <div className="flex-1 relative min-h-0">
            <HolographicGlobe mode={mode} onSelect={handleGlobeSelect} />
            <div className="absolute top-4 left-4 z-10 pointer-events-none select-none">
              <h2 className="text-sm font-semibold tracking-wide text-[var(--text-hi)] drop-shadow">
                WORLD COMMAND CENTER
              </h2>
              <p className="text-[10px] font-mono text-[var(--text-mid)] mt-0.5">
                {state.selectedEntity ? `FOCUS :: ${state.selectedEntity.toUpperCase()}` : 'SELECT A NODE TO INSPECT'}
              </p>
            </div>
            <div className="absolute top-4 right-4 z-10 w-56">
              <Tabs items={GLOBE_MODES as any} value={mode} onChange={v => setMode(v as GlobeMode)} />
            </div>
            {state.selectedEntity && (
              <button
                onClick={() => selectEntity(null)}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 rounded-full border border-[rgba(56,232,255,0.3)] bg-[rgba(6,12,18,0.85)] px-3 py-1 text-[9px] font-mono tracking-wider text-[var(--accent)] hover:bg-[rgba(56,232,255,0.12)] transition-colors"
              >
                ✕ CLEAR FOCUS
              </button>
            )}
          </div>
          <CommandConsole initialTab={consoleTab} />
        </section>

        <aside className="w-80 shrink-0 border-l border-[var(--line)] bg-[rgba(4,8,12,0.7)] backdrop-blur-md overflow-y-auto">
          {showAgents ? <AgentStatusMatrix /> : <IntelligencePanel />}
        </aside>
      </main>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Radio, Waypoints, Sparkles, Database, Brain } from 'lucide-react'
import Tabs from '../../components/ui/Tabs'
import LiveEventsTab from './tabs/LiveEventsTab'
import PropagationTab from './tabs/PropagationTab'
import AIAnalysisTab from './tabs/AIAnalysisTab'
import MemoryTab from './tabs/MemoryTab'
import AtlasConsole from './tabs/AtlasConsole'
import { useWorldStore } from '../../stores/WorldStore'
import type { AtlasEvidenceState } from '../../stores/AtlasStore'
import type { LiveEvent } from '../../types'

export type ConsoleTab = 'events' | 'propagation' | 'analysis' | 'memory' | 'command'

const BASE_TABS: { key: ConsoleTab; label: string; icon: React.ReactNode }[] = [
  { key: 'events', label: 'LIVE EVENTS', icon: <Radio size={11} /> },
  { key: 'propagation', label: 'PROPAGATION', icon: <Waypoints size={11} /> },
  { key: 'analysis', label: 'AI ANALYSIS', icon: <Sparkles size={11} /> },
  { key: 'memory', label: 'WORLD MEMORY', icon: <Database size={11} /> },
  { key: 'command', label: 'ATLAS', icon: <Brain size={11} /> },
]

interface CommandConsoleProps {
  initialTab?: ConsoleTab
  /** Routes a timeline event click through the globe selection/focus path. */
  onSelectEvent?: (event: LiveEvent) => void
  /** Canonical evidence for the current selection (market observations source). */
  evidence?: AtlasEvidenceState | null
  /** Title of the focused event; its timeline row surfaces affected markets. */
  selectedEvent?: string | null
  /** Routes an affected-asset click through the globe selection/focus path. */
  onSelectEntity?: (entity: string) => void
}

export default function CommandConsole({ initialTab = 'events', onSelectEvent, evidence, selectedEvent, onSelectEntity }: CommandConsoleProps) {
  const [tab, setTab] = useState<ConsoleTab>(initialTab)
  const isCommand = tab === 'command'
  const { state } = useWorldStore()

  // Sync tab state when the parent updates initialTab (e.g. via URL ?tab= param)
  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])
  const tabs = BASE_TABS.map(t =>
    t.key === 'events' ? { ...t, label: state.dataMode === 'live' ? 'LIVE EVENTS' : 'EVENTS \u00b7 SIMULATED' } : t,
  )
  // The events tab gives the focused event's market-impact strip a little more
  // room; every other tab keeps its existing height.
  const bodyHeight = isCommand ? 'h-64' : tab === 'events' ? 'h-32' : 'h-24'

  return (
    <section className="shrink-0 border-t border-[var(--line)] bg-[rgba(4,8,12,0.85)] backdrop-blur-md px-3 py-2">
      <Tabs items={tabs} value={tab} onChange={v => setTab(v as ConsoleTab)} className="max-w-lg mb-2" />

      <div className={`${bodyHeight} transition-all`}>
        {tab === 'events' && (
          <LiveEventsTab
            onSelectEvent={onSelectEvent}
            evidence={evidence}
            selectedEvent={selectedEvent}
            onSelectEntity={onSelectEntity}
          />
        )}
        {tab === 'propagation' && <PropagationTab />}
        {tab === 'analysis' && <AIAnalysisTab />}
        {tab === 'memory' && <MemoryTab />}
        {tab === 'command' && <AtlasConsole />}
      </div>
    </section>
  )
}

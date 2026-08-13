import { useState } from 'react'
import { Radio, Waypoints, Sparkles, Database, Terminal } from 'lucide-react'
import Tabs from '../../components/ui/Tabs'
import LiveEventsTab from './tabs/LiveEventsTab'
import PropagationTab from './tabs/PropagationTab'
import AIAnalysisTab from './tabs/AIAnalysisTab'
import MemoryTab from './tabs/MemoryTab'
import CommandInput from './CommandInput'

export type ConsoleTab = 'events' | 'propagation' | 'analysis' | 'memory' | 'command'

export const CONSOLE_TABS = [
  { key: 'events', label: 'LIVE EVENTS', icon: <Radio size={11} /> },
  { key: 'propagation', label: 'PROPAGATION', icon: <Waypoints size={11} /> },
  { key: 'analysis', label: 'AI ANALYSIS', icon: <Sparkles size={11} /> },
  { key: 'memory', label: 'WORLD MEMORY', icon: <Database size={11} /> },
  { key: 'command', label: 'COMMAND', icon: <Terminal size={11} /> },
] as const

interface CommandConsoleProps {
  initialTab?: ConsoleTab
}

export default function CommandConsole({ initialTab = 'events' }: CommandConsoleProps) {
  const [tab, setTab] = useState<ConsoleTab>(initialTab)
  const isCommand = tab === 'command'

  return (
    <section className="shrink-0 border-t border-[var(--line)] bg-[rgba(4,8,12,0.85)] backdrop-blur-md px-3 py-2">
      <Tabs items={CONSOLE_TABS as any} value={tab} onChange={v => setTab(v as ConsoleTab)} className="max-w-lg mb-2" />

      <div className={isCommand ? 'h-48' : 'h-24'} transition-all>
        {tab === 'events' && <LiveEventsTab />}
        {tab === 'propagation' && <PropagationTab />}
        {tab === 'analysis' && <AIAnalysisTab />}
        {tab === 'memory' && <MemoryTab />}
        {tab === 'command' && <CommandInput />}
      </div>
    </section>
  )
}

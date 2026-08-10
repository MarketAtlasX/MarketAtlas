import { Globe, BarChart3, GitBranch, Truck, Waves, History, Network, Sliders, Layers, BrainCircuit, Radio } from 'lucide-react'

export type GlobeMode = 'default' | 'events' | 'graph' | 'supplyChain' | 'risk' | 'similarity' | 'agent' | 'worldState' | 'forecast' | 'intelligence' | 'liveEvents'
export type AgentMode = 'conflict' | 'energy' | 'supplyChain' | 'market'

interface GlobeControlsProps {
  mode: GlobeMode
  onModeChange: (mode: GlobeMode) => void
  agentMode: AgentMode
  onAgentModeChange: (mode: AgentMode) => void
  forecastDay: number
  onForecastDayChange: (day: number) => void
  selectedEventId: string | null
  layers: Record<string, boolean>
  onLayerToggle: (layer: string) => void
}

const modes: { mode: GlobeMode; label: string; icon: typeof Globe }[] = [
  { mode: 'default', label: 'Default', icon: Globe },
  { mode: 'liveEvents', label: 'Live', icon: Radio },
  { mode: 'events', label: 'Events', icon: BarChart3 },
  { mode: 'graph', label: 'Graph', icon: GitBranch },
  { mode: 'supplyChain', label: 'Supply', icon: Truck },
  { mode: 'risk', label: 'Risk', icon: Waves },
  { mode: 'similarity', label: 'Similar', icon: History },
  { mode: 'agent', label: 'Agents', icon: Network },
  { mode: 'worldState', label: 'World', icon: Layers },
  { mode: 'forecast', label: 'Forecast', icon: Sliders },
  { mode: 'intelligence', label: 'Intelligence', icon: BrainCircuit },
]

const agents: { mode: AgentMode; label: string }[] = [
  { mode: 'conflict', label: 'Conflict' },
  { mode: 'energy', label: 'Energy' },
  { mode: 'supplyChain', label: 'Supply Chain' },
  { mode: 'market', label: 'Market' },
]

const forecastDays = [0, 7, 30, 90]

export default function GlobeControls({
  mode, onModeChange, agentMode, onAgentModeChange,
  forecastDay, onForecastDayChange, layers, onLayerToggle,
}: GlobeControlsProps) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
      <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 shadow-2xl">
        {modes.map(m => {
          const Icon = m.icon
          const active = mode === m.mode
          return (
            <button
              key={m.mode}
              onClick={() => onModeChange(m.mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                active
                  ? 'bg-white/20 text-white shadow-sm shadow-white/10 scale-105'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/10'
              }`}
              title={m.label}
            >
              <Icon size={14} className={`transition-transform duration-300 ${active ? 'scale-110' : ''}`} />
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          )
        })}
      </div>

      {mode === 'agent' && (
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 shadow-2xl mt-1">
          {agents.map(a => (
            <button
              key={a.mode}
              onClick={() => onAgentModeChange(a.mode)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                agentMode === a.mode
                  ? 'bg-purple-500/40 text-purple-300 border border-purple-400/30'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              {a.label}
            </button>
          ))}
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button
            onClick={() => onLayerToggle('ports')}
            className={`px-2 py-1 rounded text-xs ${
              layers.ports ? 'text-cyan-300' : 'text-white/40'
            }`}
            title={layers.ports ? 'Hide ports' : 'Show ports'}
          >
            Ports
          </button>
          <button
            onClick={() => onLayerToggle('labels')}
            className={`px-2 py-1 rounded text-xs ${
              layers.labels ? 'text-cyan-300' : 'text-white/40'
            }`}
            title={layers.labels ? 'Hide labels' : 'Show labels'}
          >
            Labels
          </button>
        </div>
      )}

      {mode === 'supplyChain' && (
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 shadow-2xl mt-1">
          <button
            onClick={() => onLayerToggle('supplyLabels')}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              layers.supplyLabels !== false ? 'text-amber-300' : 'text-white/40'
            }`}
          >
            Labels
          </button>
        </div>
      )}

      {mode === 'forecast' && (
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 shadow-2xl mt-1">
          <span className="text-[10px] text-white/40 mr-1">Forecast:</span>
          {forecastDays.map(d => (
            <button
              key={d}
              onClick={() => onForecastDayChange(d)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                forecastDay === d
                  ? 'bg-amber-500/40 text-amber-300 border border-amber-400/30'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              {d === 0 ? 'Today' : d === 7 ? '+7d' : d === 30 ? '+30d' : '+90d'}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

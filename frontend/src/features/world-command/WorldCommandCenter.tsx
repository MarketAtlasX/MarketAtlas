import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import NavigationRail from './NavigationRail'
import IntelligencePanel from './IntelligencePanel'
import PredictionSpace from '../prediction-space/PredictionSpace'
import EvidencePanel from '../evidence/EvidencePanel'
import { useLiveEvidenceRefresh } from '../evidence/useLiveEvidenceRefresh'
import AgentStatusMatrix from './AgentStatusMatrix'
import CommandConsole, { type ConsoleTab } from './CommandConsole'
import HolographicGlobe, { type GlobeMode } from '../globe/HolographicGlobe'
import { useWorldStore } from '../../stores/WorldStore'
import { useLiveWorldSocket } from '../../services/websocket/useLiveWorldSocket'
import Tabs from '../../components/ui/Tabs'
import { decodeReplayIntent } from '../world-memory/replayOnGlobe'
import type { VisualizationIntent } from '../globe/visualizationIntent'
import { intelligenceBus } from '../../services/intelligenceBus'
import { useAtlasStore, type AtlasLayer } from '../../stores/AtlasStore'
import type { LiveEvent } from '../../types'

const GLOBE_MODES: { key: GlobeMode; label: string }[] = [
  { key: 'world', label: 'WORLD' },
  { key: 'risk', label: 'RISK' },
  { key: 'supply', label: 'SUPPLY' },
  { key: 'map', label: 'MAP' },
  { key: 'events', label: 'EVENTS' },
]

const GLOBE_PARAMS: Record<string, GlobeMode> = {
  world: 'world',
  risk: 'risk',
  supply: 'supply',
  map: 'map',
  events: 'events',
}

function tabFromParam(p: string | null): ConsoleTab {
  if (p === 'events' || p === 'propagation' || p === 'analysis' || p === 'memory' || p === 'command') return p
  return 'events'
}

export default function WorldCommandCenter() {
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<GlobeMode>('world')
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>(() => tabFromParam(searchParams.get('tab')))
  const [replayIntent, setReplayIntent] = useState<VisualizationIntent | null>(() => decodeReplayIntent(searchParams.get('replay')))
  const { state, selectEntity } = useWorldStore()
  const { update } = useAtlasStore()
  const { state: atlasState } = useAtlasStore()

  // Fetch canonical evidence for the committed globe selection (never on hover)
  // and keep it refreshed in place while the selection is unchanged. New backend
  // WebSocket events that affect the selected entity trigger the same in-place
  // refresh, so globe → evidence → ATLAS react without a page reload.
  const { refresh: refreshEvidence, onLiveEvent } = useLiveEvidenceRefresh(state.selectedEntity)
  useLiveWorldSocket({ onLiveEvent })

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t) setConsoleTab(tabFromParam(t))
  }, [searchParams])

  useEffect(() => {
    const g = searchParams.get('globe')
    if (g && g in GLOBE_PARAMS) setMode(GLOBE_PARAMS[g])
  }, [searchParams])

  useEffect(() => {
    const nextReplay = decodeReplayIntent(searchParams.get('replay'))
    setReplayIntent(nextReplay)
    if (nextReplay?.focus?.[0]) {
      selectEntity(nextReplay.focus[0])
    } else if (nextReplay && nextReplay.mode !== 'country' && nextReplay.mode !== 'region') {
      selectEntity(null)
    }
  }, [searchParams, selectEntity])

  const showAgents = searchParams.get('tab') === 'agents'

  useEffect(() => {
    return intelligenceBus.subscribe(event => {
      if (event.type === 'ENTITY_SELECTED' && event.payload?.entity) {
        selectEntity(event.payload.entity)
      } else if (event.type === 'GLOBE_INTENT' && event.payload?.intent) {
        setReplayIntent(event.payload.intent)
      } else if (event.type === 'TAB_SWITCH' && event.payload?.tab) {
        setConsoleTab(tabFromParam(event.payload.tab))
      }
    })
  }, [selectEntity])

  // The single globe selection/focus path: commits the world selection, points
  // the Evidence panel at it, and emits the shared selection event. Both manual
  // globe clicks and Live Event timeline clicks funnel through here.
  const focusEntity = (entity: string, eventTitle: string | null = null) => {
    selectEntity(entity)
    update({ selectedCountry: entity, selectedCity: null, selectedEvent: eventTitle, highlightedEntities: [entity], openPanel: 'evidence', execution: 'idle' })
    setReplayIntent(null)
    setConsoleTab('events')
    intelligenceBus.emit('ENTITY_SELECTED', { entity })
  }

  const handleGlobeSelect = (entity: string) => focusEntity(entity)

  // A timeline event focuses its backend-provided location and records the
  // event in the existing Atlas selection state — no separate event selection
  // model. Events without a location are ignored rather than guessed at.
  const handleSelectEvent = (event: LiveEvent) => {
    const entity = event.country?.trim() || event.countryCode?.trim()
    if (!entity) return
    focusEntity(entity, event.title)
  }

  return (
    <div className="h-full w-full flex flex-col bg-command overflow-hidden">
      <main className="flex flex-1 min-h-0">
        <NavigationRail />

        <section className="flex-1 relative min-w-0 flex flex-col">
          <div className="flex-1 relative min-h-0">
            <HolographicGlobe mode={mode} intentOverride={replayIntent ?? undefined} onSelect={handleGlobeSelect} />
            <div className="absolute top-4 left-4 z-10 pointer-events-none select-none">
              <h2 className="text-sm font-semibold tracking-wide text-[var(--text-hi)] drop-shadow">
                WORLD COMMAND CENTER
              </h2>
              <p className="text-[10px] font-mono text-[var(--text-mid)] mt-0.5">
                {state.selectedEntity ? `FOCUS :: ${state.selectedEntity.toUpperCase()}` : 'SELECT A NODE TO INSPECT'}
              </p>
            </div>
            {(atlasState.execution !== 'idle' || atlasState.actionHistory.length > 0) && (
              <div className="absolute left-4 bottom-4 z-20 w-64 rounded-md border border-[rgba(56,232,255,0.25)] bg-[rgba(4,8,14,0.88)] px-3 py-2 backdrop-blur-md font-mono">
                <div className="flex items-center justify-between text-[9px] tracking-[0.16em] text-[var(--accent)]">
                  <span>ATLAS · {atlasState.execution.toUpperCase()}</span>
                  <span>{atlasState.executionSteps.filter(step => step.status === 'complete').length}/{atlasState.executionSteps.length}</span>
                </div>
                <div className="mt-1.5 space-y-1">
                  {(atlasState.executionSteps.length > 0 ? atlasState.executionSteps.map(step => ({ ...step, displayStatus: step.status })) : atlasState.actionHistory.slice(-4).map((label, index) => ({ id: `${index}-${label}`, label, displayStatus: 'complete' as const }))).slice(-4).map(step => (
                    <div key={step.id} className={`text-[10px] ${step.displayStatus === 'active' ? 'text-[var(--text-hi)]' : step.displayStatus === 'complete' ? 'text-[var(--positive)]' : 'text-[var(--text-lo)]'}`}>
                      {step.displayStatus === 'complete' ? '✓' : step.displayStatus === 'active' ? '→' : '·'} {step.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {atlasState.latestEvidence && (
              <div className="absolute right-4 bottom-4 z-20 rounded border border-[var(--line)] bg-[rgba(4,8,14,0.82)] px-2.5 py-1.5 font-mono text-[9px] text-[var(--text-mid)] backdrop-blur-md">
                <span className={atlasState.latestEvidence.status === 'live' ? 'text-[var(--positive)]' : atlasState.latestEvidence.status === 'unavailable' ? 'text-[var(--warning)]' : 'text-[var(--text-mid)]'}>
                  {atlasState.latestEvidence.status.toUpperCase()}
                </span>
                <span className="mx-1.5 text-[var(--text-lo)]">·</span>
                {atlasState.latestEvidence.freshness.toUpperCase()}
                {atlasState.latestEvidence.source ? ` · ${atlasState.latestEvidence.source}` : ''}
              </div>
            )}
            <div className="absolute top-4 right-4 z-10 w-56">
              <Tabs items={GLOBE_MODES as any} value={mode} onChange={v => {
                setReplayIntent(null)
                setMode(v as GlobeMode)
                update({ activeLayer: (v === 'risk' ? 'risk' : v === 'supply' ? 'supply-chain' : v === 'events' ? 'events' : v === 'map' ? 'world' : 'world') as AtlasLayer })
              }} />
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
          <CommandConsole
            initialTab={consoleTab}
            onSelectEvent={handleSelectEvent}
            evidence={atlasState.evidence}
            selectedEvent={atlasState.selectedEvent}
            onSelectEntity={handleGlobeSelect}
          />
        </section>

        <aside className="w-80 shrink-0 border-l border-[var(--line)] bg-[rgba(4,8,12,0.7)] backdrop-blur-md overflow-y-auto flex flex-col">
          <EvidencePanel
            evidence={atlasState.evidence}
            onSelectEntity={handleGlobeSelect}
            onRefresh={refreshEvidence}
            onAskAtlas={selection => {
              setConsoleTab('command')
              intelligenceBus.emit('EVIDENCE_ASK', {
                selection,
                evidenceRequest: true,
                query: `Explain the selected evidence for ${selection}: its sources, impacts, market observations, and causal links.`,
              })
            }}
          />
          <div className="h-px bg-[var(--line)]" />
          <PredictionSpace selectedEntity={state.selectedEntity} />
          <div className="h-px bg-[var(--line)]" />
          {showAgents ? <AgentStatusMatrix /> : <IntelligencePanel />}
        </aside>
      </main>
    </div>
  )
}

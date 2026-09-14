import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type AtlasLayer =
  | 'world'
  | 'markets'
  | 'geopolitics'
  | 'events'
  | 'supply-chain'
  | 'commodities'
  | 'capital-flows'
  | 'risk'
  | 'company-exposure'

export type AtlasPanel = 'market' | 'graph' | 'evidence' | 'analysis' | 'watchlist' | 'memory' | null
export type AtlasExecutionState = 'idle' | 'planning' | 'executing' | 'waiting' | 'speaking' | 'degraded' | 'error'

export interface AtlasExecutionStep {
  id: string
  label: string
  status: 'pending' | 'active' | 'complete' | 'failed'
}

export interface AtlasCameraState {
  lat: number
  lng: number
  altitude: number
  target: string | null
}

export interface AtlasAnalysisContext {
  query: string
  status: 'idle' | 'running' | 'success' | 'unavailable' | 'stale' | 'degraded'
  source: string | null
  updatedAt: string | null
  confidence: number | null
  uncertainty: string | null
}

export interface AtlasEvidenceSummary {
  status: 'live' | 'historical' | 'unavailable' | 'degraded'
  freshness: string
  source: string | null
  observedAt: string | null
  confidence: number | null
  limitations: string[]
}

export interface AtlasState {
  camera: AtlasCameraState
  activeLayer: AtlasLayer
  selectedCountry: string | null
  selectedCity: string | null
  selectedEvent: string | null
  selectedCompany: string | null
  highlightedEntities: string[]
  tracedRoute: string[]
  openPanel: AtlasPanel
  activeTab: string | null
  chartSymbol: string | null
  timeframe: string
  search: string
  watchlist: string[]
  analysis: AtlasAnalysisContext
  execution: AtlasExecutionState
  lastCommand: string | null
  executionSteps: AtlasExecutionStep[]
  actionHistory: string[]
  latestEvidence: AtlasEvidenceSummary | null
}

export interface AtlasContextSnapshot {
  selectedCountry: string | null
  selectedCity: string | null
  selectedEvent: string | null
  selectedCompany: string | null
  selectedStock: string | null
  activeLayer: AtlasLayer
  highlightedEntities: string[]
  globe: AtlasCameraState
  openPanel: AtlasPanel
  activeTab: string | null
  chartTimeframe: string
  watchlist: string[]
  analysis: AtlasAnalysisContext
  execution: AtlasExecutionState
  recentActions: string[]
  latestEvidence: AtlasEvidenceSummary | null
}

const initialState: AtlasState = {
  camera: { lat: 18, lng: 18, altitude: 1.92, target: null },
  activeLayer: 'world',
  selectedCountry: null,
  selectedCity: null,
  selectedEvent: null,
  selectedCompany: null,
  highlightedEntities: [],
  tracedRoute: [],
  openPanel: null,
  activeTab: null,
  chartSymbol: null,
  timeframe: '1D',
  search: '',
  watchlist: [],
  analysis: { query: '', status: 'idle', source: null, updatedAt: null, confidence: null, uncertainty: null },
  execution: 'idle',
  lastCommand: null,
  executionSteps: [],
  actionHistory: [],
  latestEvidence: null,
}

export function toAtlasContextSnapshot(state: AtlasState): AtlasContextSnapshot {
  return {
    selectedCountry: state.selectedCountry,
    selectedCity: state.selectedCity,
    selectedEvent: state.selectedEvent,
    selectedCompany: state.selectedCompany,
    selectedStock: state.chartSymbol,
    activeLayer: state.activeLayer,
    highlightedEntities: state.highlightedEntities.slice(-12),
    globe: state.camera,
    openPanel: state.openPanel,
    activeTab: state.activeTab,
    chartTimeframe: state.timeframe,
    watchlist: state.watchlist.slice(0, 20),
    analysis: state.analysis,
    execution: state.execution,
    recentActions: state.actionHistory.slice(-12),
    latestEvidence: state.latestEvidence,
  }
}

interface AtlasStoreApi {
  state: AtlasState
  update: (patch: Partial<AtlasState>) => void
  setCamera: (camera: Partial<AtlasCameraState>) => void
  reset: () => void
}

const AtlasContext = createContext<AtlasStoreApi | null>(null)

export function AtlasProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AtlasState>(initialState)
  const update = useCallback((patch: Partial<AtlasState>) => setState(current => ({ ...current, ...patch })), [])
  const setCamera = useCallback((camera: Partial<AtlasCameraState>) => {
    setState(current => ({ ...current, camera: { ...current.camera, ...camera } }))
  }, [])
  const reset = useCallback(() => setState(initialState), [])
  const value = useMemo(() => ({ state, update, setCamera, reset }), [state, update, setCamera, reset])

  return <AtlasContext.Provider value={value}>{children}</AtlasContext.Provider>
}

export function useAtlasStore(): AtlasStoreApi {
  const context = useContext(AtlasContext)
  if (!context) throw new Error('useAtlasStore must be used inside AtlasProvider')
  return context
}

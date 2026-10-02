export type LiveEventType = 'conflict' | 'election' | 'sanction' | 'trade' | 'diplomatic' | 'military' | 'economic' | 'natural' | 'market'

/**
 * Where an event entered the store, so the UI can distinguish genuinely live
 * backend events from the seeded/simulated demo data without a second store.
 */
export type LiveEventProvenance = 'live' | 'simulated'

export interface LiveEvent {
  id: string
  title: string
  countryCode: string
  country: string
  type: LiveEventType
  severity: number
  /** Backend-provided coordinates, or `null` when the source omitted them. */
  lat: number | null
  lng: number | null
  timestamp: string
  summary: string
  sectors: string[]
  /** 'live' for backend-ingested events; absent/'simulated' for seed data. */
  provenance?: LiveEventProvenance
  /**
   * Backend lifecycle status when the provider supplies one (e.g. 'breaking',
   * 'updated', 'resolved'). Never inferred — copied from the backend payload.
   */
  status?: string
}

export interface MarketSignal {
  symbol: string
  name: string
  price: number
  changePct: number
  direction: 'UP' | 'DOWN'
  confidence: number
  context: string
}

export interface RiskUpdate {
  entity: string
  risk: number
  timestamp: string
}

export interface GraphLink {
  source: string
  target: string
  influence: number
  label?: string
}

export interface AgentStatus {
  name: string
  state: 'active' | 'analyzing' | 'insight'
  consensus: number | null
  lastInsight?: string
}

export interface WorldRisk {
  score: number
  level: 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL'
  drivers: { entity: string; score: number }[]
}

export interface WorldStoreState {
  events: LiveEvent[]
  signals: MarketSignal[]
  riskUpdates: RiskUpdate[]
  graphLinks: GraphLink[]
  agents: AgentStatus[]
  worldRisk: WorldRisk
  selectedEntity: string | null
  dataMode: 'live' | 'delayed' | 'cached' | 'historical' | 'simulated' | 'degraded'
  updatedAt: string | null
  forecast: { symbol: string; bullish: number; base: number; bearish: number; confidence: number }
}

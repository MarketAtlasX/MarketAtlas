export type LiveEventType = 'conflict' | 'election' | 'sanction' | 'trade' | 'diplomatic' | 'military' | 'economic' | 'natural' | 'market'

export interface LiveEvent {
  id: string
  title: string
  countryCode: string
  country: string
  type: LiveEventType
  severity: number
  lat: number
  lng: number
  timestamp: string
  summary: string
  sectors: string[]
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
  consensus: number
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
  forecast: { symbol: string; bullish: number; base: number; bearish: number; confidence: number }
}

export interface GraphNode {
  id: string
  label: string
  type: string
  confidence?: number
  value?: number | null
  change_pct?: number | null
  risk?: number | null
  lat?: number | null
  lng?: number | null
  metadata?: Record<string, unknown>
}

export interface GraphEdge {
  source: string
  target: string
  label: string
  type: string
  weight?: number
  confidence?: number
  metadata?: Record<string, unknown>
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  metadata?: Record<string, unknown>
}

export interface ForecastPoint {
  day: number
  date: string
  value: number
  upper: number
  lower: number
  confidence: number
}

export interface ForecastGraph {
  symbol: string
  company_name: string
  current_price: number
  historical: ForecastPoint[]
  predicted: ForecastPoint[]
  metadata?: Record<string, unknown>
}

export interface CausalPath {
  nodes: GraphNode[]
  edges: GraphEdge[]
  strength: number
  description: string
}

export interface CausalGraph {
  root_event: string
  target_asset: string
  paths: CausalPath[]
  ranked_paths: number[]
  combined_graph: GraphData
  metadata?: Record<string, unknown>
}

export interface AgentOpinion {
  agent_name: string
  confidence: number
  sentiment: string
  reasoning?: string
  supports?: string[]
  contradicts?: string[]
}

export interface ReasoningGraph {
  target: string
  agents: AgentOpinion[]
  graph: GraphData
  consensus?: string | null
  consensus_confidence: number
  metadata?: Record<string, unknown>
}

export interface ConfidenceFactor {
  name: string
  value: number
  weight: number
  description?: string
}

export interface ConfidenceGraph {
  target: string
  overall_confidence: number
  factors: ConfidenceFactor[]
  prediction_value?: number | null
  prediction_direction: string
  metadata?: Record<string, unknown>
}

export interface GraphEngineResponse {
  status: string
  graph_type: string
  data: Record<string, unknown>
  timestamp: string
  version: string
}

export interface GraphUpdate {
  type: string
  action?: string
  data?: unknown
  payload?: Record<string, unknown>
  timestamp?: string
}

export type GraphViewType = 'forecast' | 'causal' | 'reasoning' | 'confidence' | 'all'

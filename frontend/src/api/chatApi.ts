export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export type VisualMode =
  | 'core'
  | 'globe'
  | 'country'
  | 'region'
  | 'route'
  | 'network'
  | 'risk'
  | 'conflict'
  | 'abstract'
  | 'map'
  | 'supply'

export interface VisualizationIntent {
  mode: VisualMode
  scale: string
  focus: string[]
  origin?: string | null
  destination?: string | null
  transition: string
  camera: string
  palette: string
  caption: string
}

export interface ChatResponse {
  conversation_id: string
  query: string
  response: string
  intent: string
  agents_used: string[]
  confidence: number
  sources: string[]
  visualization?: VisualizationIntent | null
}

export interface AtlasAgentMessage {
  role: 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>
  tool_call_id?: string
}

export interface AtlasAgentTurnResponse {
  message: AtlasAgentMessage
  provider: string
}

export interface IntelligenceReport {
  title: string
  event: string
  affected_sectors: string[]
  risk_score: number
  expected_market_impact: string
  recommended_assets: string[]
  confidence: number
  reasoning: string
  sources: string[]
  timestamp: string
}

export interface SimulationResult {
  scenario: string
  consequences: Record<string, string>
  probability: number
  time_horizon: string
  key_risks: string[]
}

let backendAvailable: boolean | null = null

const CONVERSATION_KEY = 'marketatlas_conversation_id'

export async function backendOnline(): Promise<boolean> {
  if (backendAvailable === true) return true
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(2000) })
    backendAvailable = res.ok
    return backendAvailable
  } catch {
    backendAvailable = null
    return false
  }
}

function getConversationId(): string {
  let id = localStorage.getItem(CONVERSATION_KEY)
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `conv-${Date.now()}`
    localStorage.setItem(CONVERSATION_KEY, id)
  }
  return id
}

export function resetConversation(): void {
  localStorage.removeItem(CONVERSATION_KEY)
}

export async function sendChat(query: string): Promise<ChatResponse> {
  const online = await backendOnline()
  if (!online) throw new Error('Atlas intelligence unavailable: backend is offline')
  try {
    const { getUserId } = await import('../simulation/auth')
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        conversation_id: getConversationId(),
        user_id: getUserId(),
      }),
      signal: AbortSignal.timeout(60000),
    })
    if (!res.ok) throw new Error('API error')
    const data = await res.json()
    if (data.conversation_id) {
      localStorage.setItem(CONVERSATION_KEY, data.conversation_id)
    }
    return data
  } catch {
    backendAvailable = null
    throw new Error('Atlas intelligence unavailable: service request failed')
  }
}

export async function runAtlasAgentTurn(
  messages: AtlasAgentMessage[],
  tools: unknown[],
  context: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<AtlasAgentTurnResponse> {
  const { ensureAuth } = await import('../simulation/auth')
  const token = await ensureAuth()
  const response = await fetch('/api/chat/agent/turn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messages, tools, context }),
    signal,
  })
  if (!response.ok) throw new Error('Structured Atlas provider unavailable')
  return response.json() as Promise<AtlasAgentTurnResponse>
}

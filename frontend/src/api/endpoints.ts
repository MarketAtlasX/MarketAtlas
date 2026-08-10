export const API_BASE = '/api/v1'

export const ENDPOINTS = {
  chat: {
    send: `${API_BASE}/chat`,
    stream: `${API_BASE}/chat/stream`,
  },
  health: `${API_BASE}/health`,
  history: `${API_BASE}/history`,
  memory: (id: string) => `${API_BASE}/memory/${id}`,
  knowledge: {
    search: `${API_BASE}/knowledge/search`,
  },
  graph: {
    entity: (name: string) => `${API_BASE}/graph/${encodeURIComponent(name)}`,
  },
  ws: {
    chat: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`,
  },
} as const

export interface WebSocketMessage {
  type: 'connected' | 'response' | 'stream_start' | 'stream_end' | 'chunk' | 'metadata' | 'error'
  client_id?: string
  conversation_id?: string
  response?: string
  text?: string
  intent?: string
  agents_used?: string[]
  confidence?: number
  message?: string
}

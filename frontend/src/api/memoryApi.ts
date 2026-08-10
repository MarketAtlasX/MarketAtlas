import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 2000,
})

let backendAvailable: boolean | null = null
let checkingBackend = false
let checkQueue: Array<(v: boolean) => void> = []

function checkBackend(): Promise<boolean> {
  if (backendAvailable !== null) return Promise.resolve(backendAvailable)
  if (checkingBackend) {
    return new Promise(resolve => checkQueue.push(resolve))
  }
  checkingBackend = true
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 1000)
  return fetch('/api/health', { signal: controller.signal })
    .then(r => {
      backendAvailable = r.ok
      return backendAvailable
    })
    .catch(() => {
      backendAvailable = false
      return false
    })
    .finally(() => {
      clearTimeout(timeout)
      checkingBackend = false
      checkQueue.forEach(r => r(backendAvailable!))
      checkQueue = []
    })
}

export interface Episode {
  id: string
  title: string
  summary: string
  timestamp: string
  locations: string[]
  sectors: string[]
  commodities: string[]
  participants: Array<{ name: string; role: string }>
  confidence: number
  similarity_score?: number
  similarity_breakdown?: Record<string, number>
  outcomes?: Array<{ category: string; severity: string; description: string }>
  lessons?: Array<{ text: string; category: string; confidence: number }>
}

export interface SimilarResult {
  episode: Episode
  similarity: number
  breakdown: Record<string, number>
}

export interface Lesson {
  text: string
  category: string
  confidence: number
}

const MOCK_EPISODES: Episode[] = [
  {
    id: 'ep-001',
    title: 'Iran Missile Strike Crisis',
    summary: 'Iran launched missile strikes on Israeli positions, escalating Middle East tensions. Oil prices surged 8% as markets priced in supply disruption.',
    timestamp: '2026-07-14T10:30:00Z',
    locations: ['Iran', 'Israel', 'Middle East'],
    sectors: ['energy', 'defense'],
    commodities: ['oil'],
    participants: [{ name: 'Iran', role: 'actor' }, { name: 'Israel', role: 'target' }],
    confidence: 0.85,
    outcomes: [{ category: 'market', severity: 'high', description: 'Oil prices +8%' }],
    lessons: [{ text: 'Middle East military escalations consistently drive oil price spikes of 5-15%', category: 'market', confidence: 0.72 }],
  },
  {
    id: 'ep-002',
    title: 'China Tech Export Controls',
    summary: 'China imposed new export restrictions on rare earth minerals and semiconductor materials, impacting global supply chains.',
    timestamp: '2026-07-10T08:00:00Z',
    locations: ['China', 'United States', 'Taiwan'],
    sectors: ['technology', 'commodities'],
    commodities: ['lithium', 'copper'],
    participants: [{ name: 'China', role: 'actor' }, { name: 'United States', role: 'target' }],
    confidence: 0.78,
    outcomes: [{ category: 'economic', severity: 'moderate', description: 'Tech sector -3%' }],
    lessons: [{ text: 'Export controls create supply chain bottlenecks lasting 6-12 months', category: 'supply_chain', confidence: 0.68 }],
  },
]

export async function searchEpisodes(query: string, limit = 10): Promise<Episode[]> {
  const online = await checkBackend()
  if (!online) return MOCK_EPISODES.filter(e => e.title.toLowerCase().includes(query.toLowerCase())).slice(0, limit)
  try {
    const { data } = await api.get(`/memory/search?query=${encodeURIComponent(query)}&limit=${limit}`)
    return data
  } catch {
    backendAvailable = false
    return MOCK_EPISODES.filter(e => e.title.toLowerCase().includes(query.toLowerCase())).slice(0, limit)
  }
}

export async function findSimilar(episodeId: string): Promise<SimilarResult[]> {
  const online = await checkBackend()
  if (!online) return []
  try {
    const { data } = await api.get(`/memory/similar/${episodeId}`)
    return data
  } catch {
    backendAvailable = false
    return []
  }
}

export async function findAnalogous(episodeId: string): Promise<SimilarResult[]> {
  const online = await checkBackend()
  if (!online) return []
  try {
    const { data } = await api.get(`/memory/analogous/${episodeId}`)
    return data
  } catch {
    backendAvailable = false
    return []
  }
}

export async function getLessons(episodeId: string): Promise<Lesson[]> {
  const online = await checkBackend()
  if (!online) {
    const ep = MOCK_EPISODES.find(e => e.id === episodeId)
    return ep?.lessons ?? []
  }
  try {
    const { data } = await api.get(`/memory/lessons/${episodeId}`)
    return data
  } catch {
    backendAvailable = false
    const ep = MOCK_EPISODES.find(e => e.id === episodeId)
    return ep?.lessons ?? []
  }
}

export async function generateLessons(episodeId: string): Promise<Lesson[]> {
  const online = await checkBackend()
  if (!online) return []
  try {
    const { data } = await api.post(`/memory/lessons/${episodeId}/generate`)
    return data.lessons ?? []
  } catch {
    backendAvailable = false
    return []
  }
}

export async function getTimeline(episodeId: string): Promise<{ events: Array<{ date: string; description: string }> }> {
  const online = await checkBackend()
  if (!online) return { events: [] }
  try {
    const { data } = await api.get(`/memory/timeline/${episodeId}`)
    return data
  } catch {
    backendAvailable = false
    return { events: [] }
  }
}

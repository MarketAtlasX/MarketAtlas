import { api as apiClient } from './client'
import type { AnalysisResult } from './client'

export interface EventItem {
  id: number
  title: string
  description: string
  event_type: string
  severity: string
  status: string
  event_date: string
  source?: string
  source_url?: string
}

export interface MarketPrice {
  id: number
  entity_id: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  price_date: string
}

export interface PaginatedResponse<T> {
  total: number
  skip: number
  limit: number
  items: T[]
}

export async function fetchEvents(params?: {
  skip?: number
  limit?: number
  type?: string
  severity?: string
}): Promise<PaginatedResponse<EventItem>> {
  const query = new URLSearchParams()
  if (params?.skip) query.set('skip', String(params.skip))
  if (params?.limit) query.set('limit', String(params.limit))
  if (params?.type) query.set('type', params.type)
  if (params?.severity) query.set('severity', params.severity)

  const { data } = await apiClient.get(`/events?${query}`)
  return data
}

export async function fetchMarketPrices(
  entityId: number,
  days = 30,
): Promise<MarketPrice[]> {
  const { data } = await apiClient.get(`/market-prices/entity/${entityId}/recent?days=${days}`)
  return data.items || data || []
}

export async function fetchLatestPrice(entityId: number): Promise<MarketPrice | null> {
  try {
    const { data } = await apiClient.get(`/market-prices/entity/${entityId}/latest`)
    return data
  } catch {
    return null
  }
}

export async function fetchAnalysis(text: string, ticker?: string): Promise<AnalysisResult> {
  const { data } = await apiClient.post('/analyze', { text, ticker })
  return data
}

import { api } from './client'

export interface LiveEvent {
  id: string
  title: string
  description: string | null
  event_type: string
  sub_type: string | null
  severity: number
  impact_score: number | null
  confidence: number | null
  status: string
  source: string | null
  source_urls: Array<{ url: string; title: string; source: string }> | null
  lat: number | null
  lng: number | null
  country_code: string | null
  region: string | null
  event_date: string | null
  detected_at: string | null
  first_seen_at: string
  updated_at: string
  resolved_at: string | null
}

export interface EventImpact {
  id: string
  event_id: string
  entity_name: string
  entity_type: string
  impact_direction: 'positive' | 'negative' | 'neutral' | 'mixed'
  impact_score: number
  confidence: number
  impact_type: string
  analysis_summary: string | null
  reasoning_factors: Record<string, unknown> | null
  generated_by: string
  created_at: string
  affected_assets: EventAffectedAsset[]
}

export interface EventAffectedAsset {
  id: string
  impact_id: string
  asset_type: string
  ticker: string | null
  name: string
  estimated_move: number | null
  volatility_impact: number | null
  time_horizon: string
  current_price: number | null
  price_direction: string
}

export interface EventNewsArticle {
  id: string
  event_id: string
  url: string
  title: string
  source: string | null
  author: string | null
  published_at: string | null
  content_snippet: string | null
  sentiment: number | null
  relevance_score: number | null
  fetched_at: string
}

export interface UserAlert {
  id: string
  event_id: string | null
  rule_name: string | null
  title: string
  message: string | null
  is_read: boolean
  created_at: string
}

export interface LiveEventFilterParams {
  skip?: number
  limit?: number
  type?: string
  subType?: string
  status?: string
  severityMin?: number
  severityMax?: number
  countryCode?: string
  region?: string
  source?: string
  keyword?: string
  sector?: string
  sortBy?: string
  sortDesc?: boolean
}

export interface LiveEventStats {
  total: number
  by_type: Record<string, number>
  by_status: Record<string, number>
  by_severity_bucket: Record<string, number>
  avg_severity: number
  avg_impact_score: number | null
  breaking_count: number
}

export interface LiveEventTimelineItem {
  bucket: string
  count: number
  avg_severity: number
  top_types: string[]
}

export interface PaginatedResponse<T> {
  total: number
  skip: number
  limit: number
  items: T[]
}

const BASE = '/live-events'

async function apiGet<T>(url: string): Promise<T> {
  const { data } = await api.get<T>(url)
  return data
}

async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.post<T>(url, body)
  return data
}

async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.put<T>(url, body)
  return data
}

async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.patch<T>(url, body)
  return data
}

function buildQuery(params: LiveEventFilterParams): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  })
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export const liveEventsApi = {
  list: (params: LiveEventFilterParams = {}) =>
    apiGet<PaginatedResponse<LiveEvent>>(`${BASE}${buildQuery(params)}`),

  get: (id: string) =>
    apiGet<LiveEvent & { impacts: EventImpact[]; news_articles: EventNewsArticle[] }>(`${BASE}/${id}`),

  create: (event: Partial<LiveEvent>) =>
    apiPost<LiveEvent>(BASE, event),

  update: (id: string, event: Partial<LiveEvent>) =>
    apiPut<LiveEvent>(`${BASE}/${id}`, event),

  changeStatus: (id: string, status: string) =>
    apiPatch<LiveEvent>(`${BASE}/${id}/status`, { status }),

  getStats: () =>
    apiGet<LiveEventStats>(`${BASE}/stats`),

  getTimeline: (hours: number = 24) =>
    apiGet<LiveEventTimelineItem[]>(`${BASE}/timeline?hours=${hours}`),

  getImpacts: (id: string) =>
    apiGet<{ items: EventImpact[]; total: number }>(`${BASE}/${id}/impacts`),

  addImpact: (id: string, impact: Partial<EventImpact>) =>
    apiPost<EventImpact>(`${BASE}/${id}/impacts`, impact),

  getNews: (id: string) =>
    apiGet<{ items: EventNewsArticle[]; total: number }>(`${BASE}/${id}/news`),

  addNewsArticle: (id: string, article: Partial<EventNewsArticle>) =>
    apiPost<EventNewsArticle>(`${BASE}/${id}/news`, article),
}

export const alertApi = {
  list: () =>
    apiGet<UserAlert[]>('/live-events/alerts'),

  unreadCount: () =>
    apiGet<{ count: number }>('/live-events/alerts/unread-count'),

  markRead: (id: string) =>
    apiPost<void>(`/live-events/alerts/${id}/read`),

  markAllRead: () =>
    apiPost<void>('/live-events/alerts/read-all'),
}

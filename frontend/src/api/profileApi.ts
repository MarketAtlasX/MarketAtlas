import { api } from './client'
import type {
  Profile,
  PortfolioSummary,
  Trade,
  WatchlistAlertEvaluation,
  WatchlistAlertEvent,
  WatchlistAlertKind,
  WatchlistAlertRule,
  WatchlistAlertSchedulerHealth,
  WatchlistEvidence,
  WatchlistHistory,
  WatchlistAtlasContext,
  WatchlistItem,
  WatchlistQuoteItem,
} from '../types'

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function getProfile(): Promise<Profile> {
  const { data } = await api.get<Profile>('/v1/profile/me')
  return data
}

export async function updateProfile(display_name: string): Promise<Profile> {
  const { data } = await api.patch<Profile>('/v1/profile/me', { display_name })
  return data
}

// ---------------------------------------------------------------------------
// Portfolio summary
// ---------------------------------------------------------------------------

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  const { data } = await api.get<PortfolioSummary>('/v1/profile/summary')
  return data
}

// ---------------------------------------------------------------------------
// Trades
// ---------------------------------------------------------------------------

export async function getTrades(options?: {
  trade_type?: 'intraday' | 'normal'
  status?: 'open' | 'closed' | 'pending'
}): Promise<Trade[]> {
  const params = new URLSearchParams()
  if (options?.trade_type) params.set('trade_type', options.trade_type)
  if (options?.status) params.set('status', options.status)
  const { data } = await api.get<Trade[]>('/v1/profile/trades?' + params.toString())
  return data
}

export async function createTrade(trade: Omit<Trade, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'current_value' | 'profit_loss' | 'profit_loss_percent' | 'status'>): Promise<Trade> {
  const { data } = await api.post<Trade>('/v1/profile/trades', trade)
  return data
}

export async function updateTrade(
  tradeId: string,
  updates: {
    current_price?: number
    current_value?: number
    profit_loss?: number
    profit_loss_percent?: number
    status?: 'open' | 'closed' | 'pending'
    notes?: string
  },
): Promise<Trade> {
  const { data } = await api.patch<Trade>(`/v1/profile/trades/${tradeId}`, updates)
  return data
}

export async function closeTrade(tradeId: string): Promise<Trade> {
  return updateTrade(tradeId, { status: 'closed' })
}

export async function deleteTrade(tradeId: string): Promise<void> {
  await api.delete(`/v1/profile/trades/${tradeId}`)
}

// ---------------------------------------------------------------------------
// Watchlist
// ---------------------------------------------------------------------------

export async function getWatchlist(active_only = true): Promise<WatchlistItem[]> {
  const params = new URLSearchParams([['active_only', String(active_only)]])
  const { data } = await api.get<WatchlistItem[]>('/v1/profile/watchlist?' + params.toString())
  return data
}

export async function addToWatchlist(item: Omit<WatchlistItem, 'id' | 'user_id' | 'current_price' | 'price_change' | 'price_change_percent' | 'is_active' | 'created_at' | 'updated_at'>): Promise<WatchlistItem> {
  const { data } = await api.post<WatchlistItem>('/v1/profile/watchlist', item)
  return data
}

export async function updateWatchlistItem(
  itemId: string,
  updates: {
    company_name?: string
    asset_type?: string
    target_price?: number
    stop_loss?: number
    notes?: string
    is_active?: boolean
  },
): Promise<WatchlistItem> {
  const { data } = await api.patch<WatchlistItem>(`/v1/profile/watchlist/${itemId}`, updates)
  return data
}

export async function removeFromWatchlist(itemId: string): Promise<void> {
  await api.delete(`/v1/profile/watchlist/${itemId}`)
}

// ---------------------------------------------------------------------------
// Watchlist intelligence
// ---------------------------------------------------------------------------

/** Every active watchlist item joined with its provider-backed market quote. */
export async function getWatchlistQuotes(): Promise<WatchlistQuoteItem[]> {
  const { data } = await api.get<WatchlistQuoteItem[]>('/v1/profile/watchlist/quotes')
  return data
}

/** Compact provider-backed close series for a sparkline. */
export async function getWatchlistHistory(
  itemId: string,
  interval: 'daily' | 'weekly' | 'monthly' = 'daily',
  points = 30,
): Promise<WatchlistHistory> {
  const params = new URLSearchParams({ interval, points: String(points) })
  const { data } = await api.get<WatchlistHistory>(
    `/v1/profile/watchlist/${itemId}/history?${params.toString()}`,
  )
  return data
}

/** Recorded and candidate geopolitical evidence for one watched asset. */
export async function getWatchlistEvidence(itemId: string): Promise<WatchlistEvidence> {
  const { data } = await api.get<WatchlistEvidence>(`/v1/profile/watchlist/${itemId}/evidence`)
  return data
}

// ---------------------------------------------------------------------------
// Watchlist alerts
// ---------------------------------------------------------------------------

export async function getAlertRules(): Promise<WatchlistAlertRule[]> {
  const { data } = await api.get<WatchlistAlertRule[]>('/v1/profile/watchlist/alerts')
  return data
}

export async function createAlertRule(input: {
  watchlist_id: string
  kind: WatchlistAlertKind
  threshold?: number
  percent_threshold?: number
  direction?: 'above' | 'below'
  cooldown_seconds?: number
  notes?: string
}): Promise<WatchlistAlertRule> {
  const { data } = await api.post<WatchlistAlertRule>('/v1/profile/watchlist/alerts', input)
  return data
}

export async function updateAlertRule(
  ruleId: string,
  updates: Partial<{
    threshold: number
    percent_threshold: number
    direction: 'above' | 'below'
    cooldown_seconds: number
    is_active: boolean
    notes: string
  }>,
): Promise<WatchlistAlertRule> {
  const { data } = await api.patch<WatchlistAlertRule>(
    `/v1/profile/watchlist/alerts/${ruleId}`,
    updates,
  )
  return data
}

export async function deleteAlertRule(ruleId: string): Promise<void> {
  await api.delete(`/v1/profile/watchlist/alerts/${ruleId}`)
}

export async function getAlertEvents(limit = 50, unreadOnly = false): Promise<WatchlistAlertEvent[]> {
  const params = new URLSearchParams({ limit: String(limit), unread_only: String(unreadOnly) })
  const { data } = await api.get<WatchlistAlertEvent[]>(
    `/v1/profile/watchlist/alerts/events?${params.toString()}`,
  )
  return data
}

export async function getAlertUnreadCount(): Promise<number> {
  const { data } = await api.get<{ count: number }>('/v1/profile/watchlist/alerts/unread-count')
  return data.count
}

export async function markAlertEventRead(eventId: string): Promise<WatchlistAlertEvent> {
  const { data } = await api.post<WatchlistAlertEvent>(
    `/v1/profile/watchlist/alerts/events/${eventId}/read`,
  )
  return data
}

export async function markAllAlertEventsRead(): Promise<number> {
  const { data } = await api.post<{ marked: number }>(
    '/v1/profile/watchlist/alerts/events/read-all',
  )
  return data.marked
}

export async function getAlertSchedulerHealth(): Promise<WatchlistAlertSchedulerHealth> {
  const { data } = await api.get<WatchlistAlertSchedulerHealth>(
    '/v1/profile/watchlist/alerts/scheduler',
  )
  return data
}

/** Server-side evaluation of all the current user's active alert rules. */
export async function evaluateAlerts(): Promise<WatchlistAlertEvaluation> {
  const { data } = await api.post<WatchlistAlertEvaluation>(
    '/v1/profile/watchlist/alerts/evaluate',
  )
  return data
}

/**
 * Authorized, user-scoped watchlist context for grounded ATLAS answers.
 * Never returns another user's assets. Requires a valid session token.
 */
export async function getWatchlistAtlasContext(): Promise<WatchlistAtlasContext> {
  const { data } = await api.get<WatchlistAtlasContext>('/v1/profile/watchlist/atlas-context')
  return data
}

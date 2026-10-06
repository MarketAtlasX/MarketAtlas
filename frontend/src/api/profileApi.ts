import { api } from './client'
import type {
  Profile,
  PortfolioSummary,
  Trade,
  WatchlistItem,
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

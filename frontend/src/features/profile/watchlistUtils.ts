import { isAxiosError } from 'axios'

import type { WatchlistMarketQuote, WatchlistQuoteItem } from '../../types'

export type WatchlistSortKey = 'name' | 'movement' | 'type' | 'updated'
export type WatchlistSortDirection = 'asc' | 'desc'

export const WATCHLIST_ASSET_TYPES = ['stock', 'etf', 'commodity', 'index', 'currency', 'bond'] as const

export function formatPrice(value: number | null | undefined, currency?: string | null): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 2,
  })
}

export function formatChangePercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function formatSigned(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}`
}

export function movementTone(value: number | null | undefined): string {
  if (value == null || value === 0) return 'var(--text-mid)'
  return value > 0 ? 'var(--positive)' : 'var(--critical)'
}

/**
 * Human-readable relative time. Uses the browser clock only for *display*;
 * the underlying timestamp always originates from the backend.
 */
export function relativeTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'unknown'
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return 'unknown'
  const seconds = Math.round((now - then) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

/** A quote is displayable only when the provider actually returned a price. */
export function hasLiveMarket(market: WatchlistMarketQuote | undefined): boolean {
  return market?.status === 'provider-backed' && market.price != null
}

export function sortWatchlist(
  items: WatchlistQuoteItem[],
  key: WatchlistSortKey,
  direction: WatchlistSortDirection = 'asc',
): WatchlistQuoteItem[] {
  const sign = direction === 'asc' ? 1 : -1
  const copy = [...items]
  copy.sort((a, b) => {
    switch (key) {
      case 'movement': {
        const av = a.market?.change_percent
        const bv = b.market?.change_percent
        // Symbols without a quote sort last regardless of direction.
        if (av == null && bv == null) return 0
        if (av == null) return 1
        if (bv == null) return -1
        return (av - bv) * sign
      }
      case 'type':
        return a.asset_type.localeCompare(b.asset_type) * sign || a.ticker.localeCompare(b.ticker)
      case 'updated': {
        const av = Date.parse(a.updated_at ?? '') || 0
        const bv = Date.parse(b.updated_at ?? '') || 0
        return (av - bv) * sign
      }
      case 'name':
      default:
        return (
          (a.company_name || a.ticker).localeCompare(b.company_name || b.ticker) * sign ||
          a.ticker.localeCompare(b.ticker)
        )
    }
  })
  return copy
}

export function filterWatchlist(
  items: WatchlistQuoteItem[],
  options: { query?: string; assetType?: string } = {},
): WatchlistQuoteItem[] {
  const query = (options.query ?? '').trim().toLowerCase()
  const assetType = options.assetType ?? 'all'
  return items.filter(item => {
    if (assetType !== 'all' && item.asset_type !== assetType) return false
    if (!query) return true
    return (
      item.ticker.toLowerCase().includes(query) ||
      (item.company_name ?? '').toLowerCase().includes(query)
    )
  })
}

export function apiError(error: unknown, fallback: string): string {
  // Kept local so both the section and its panels share identical messaging.
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
    if (!error.response) return 'Cannot reach the MarketAtlas backend. Is it running?'
  }
  return fallback
}

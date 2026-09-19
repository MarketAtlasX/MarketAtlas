/**
 * Market Data API — Fetches real price data from the backend.
 *
 * Wraps the backend's /market-prices and /market-data/sectors endpoints.
 * Falls back to seed data when the backend is unreachable.
 */

import { getHealth } from './client'

export interface MarketQuote {
  symbol: string
  name: string
  price: number
  changePct: number
  volume?: number
  marketCap?: number
  high52w?: number
  low52w?: number
  timestamp: string
  synthetic?: boolean
  status?: 'provider-backed' | 'cached' | 'unavailable' | 'simulated'
}

export interface MarketObservation {
  symbol: string
  assetType: 'equity' | 'index' | 'commodity' | 'currency' | 'unknown'
  price: number | null
  change: number | null
  changePercent: number | null
  timestamp: string | null
  provider: string | null
  freshness: string
  status: 'provider-backed' | 'cached' | 'unavailable' | 'simulated'
  currency?: string | null
}

export type MarketHistoryRow = {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  provider: string | null
}

export interface MarketHistoryObservation {
  status: 'provider-backed' | 'unavailable'
  symbol: string
  interval: string
  provider?: string | null
  freshness: string
  timestamp?: string | null
  history: MarketHistoryRow[]
  limitations?: string[]
}

export interface SectorSnapshot {
  sector: string
  returnPct: number
  volatility: number
  tickers: string[]
  synthetic?: boolean
  status?: 'provider-backed' | 'cached' | 'unavailable' | 'simulated'
}

// ── Cache ──────────────────────────────────────────────────────────────────

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
let quoteCache: { data: MarketQuote[]; ts: number } | null = null
let sectorCache: { data: SectorSnapshot[]; ts: number } | null = null

function isFresh(cache: { ts: number } | null): boolean {
  return cache !== null && Date.now() - cache.ts < CACHE_TTL
}

// ── Seed data (offline fallback) ───────────────────────────────────────────

const SEED_QUOTES: MarketQuote[] = [
  { symbol: 'NVDA', name: 'NVIDIA', price: 182.4, changePct: 4.8, timestamp: new Date().toISOString(), synthetic: true },
  { symbol: 'AAPL', name: 'Apple', price: 231.2, changePct: -1.2, timestamp: new Date().toISOString(), synthetic: true },
  { symbol: 'MSFT', name: 'Microsoft', price: 448.6, changePct: 1.3, timestamp: new Date().toISOString(), synthetic: true },
  { symbol: 'TSLA', name: 'Tesla', price: 312.8, changePct: -2.1, timestamp: new Date().toISOString(), synthetic: true },
  { symbol: 'AMZN', name: 'Amazon', price: 198.4, changePct: 0.8, timestamp: new Date().toISOString(), synthetic: true },
  { symbol: 'GOOGL', name: 'Alphabet', price: 178.9, changePct: 1.1, timestamp: new Date().toISOString(), synthetic: true },
  { symbol: 'META', name: 'Meta', price: 512.3, changePct: 2.4, timestamp: new Date().toISOString(), synthetic: true },
  { symbol: 'XOM', name: 'Exxon Mobil', price: 118.6, changePct: 3.1, timestamp: new Date().toISOString(), synthetic: true },
  { symbol: 'SHEL', name: 'Shell', price: 72.9, changePct: 2.7, timestamp: new Date().toISOString(), synthetic: true },
  { symbol: 'TSM', name: 'TSMC ADR', price: 214.8, changePct: -2.4, timestamp: new Date().toISOString(), synthetic: true },
  { symbol: 'GC', name: 'Gold', price: 2482.1, changePct: 1.9, timestamp: new Date().toISOString(), synthetic: true },
]

const SEED_SECTORS: SectorSnapshot[] = [
  { sector: 'Technology', returnPct: 2.1, volatility: 0.24, tickers: ['AAPL', 'MSFT', 'NVDA'], synthetic: true },
  { sector: 'Energy', returnPct: 3.4, volatility: 0.31, tickers: ['XOM', 'CVX', 'COP'], synthetic: true },
  { sector: 'Semiconductors', returnPct: 1.8, volatility: 0.28, tickers: ['AMD', 'INTC', 'AVGO'], synthetic: true },
  { sector: 'Defense', returnPct: 1.2, volatility: 0.18, tickers: ['LMT', 'RTX', 'NOC'], synthetic: true },
  { sector: 'Financials', returnPct: 0.9, volatility: 0.19, tickers: ['JPM', 'BAC', 'GS'], synthetic: true },
  { sector: 'Healthcare', returnPct: 0.6, volatility: 0.15, tickers: ['JNJ', 'UNH', 'LLY'], synthetic: true },
]

// ── API ────────────────────────────────────────────────────────────────────

export async function fetchQuotes(): Promise<MarketQuote[]> {
  if (isFresh(quoteCache)) return quoteCache!.data

  try {
    await getHealth()
    const res = await fetch('/api/market-prices?limit=20', {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) throw new Error('API error')
    const data = await res.json()

    const quotes: MarketQuote[] = (data.items ?? data ?? []).map((item: any) => ({
      symbol: item.ticker ?? item.symbol ?? 'UNKNOWN',
      name: item.entity_name ?? item.name ?? item.ticker ?? '',
      price: item.close ?? item.price ?? 0,
      changePct: item.change_pct ?? (item.open ? ((item.close - item.open) / item.open * 100) : 0),
      volume: item.volume,
      marketCap: item.market_cap,
      high52w: item.high_52w,
      low52w: item.low_52w,
      timestamp: item.date ?? item.timestamp ?? new Date().toISOString(),
    }))

    const available = quotes.length > 0 ? quotes.map(quote => ({ ...quote, status: 'provider-backed' as const })) : []
    quoteCache = { data: available, ts: Date.now() }
    return quoteCache.data
  } catch {
    // Always return seed data as fallback so the UI is never empty.
    // When the backend is live, the cache is populated with real data.
    const fallback = SEED_QUOTES.map(quote => ({ ...quote, status: 'simulated' as const }))
    quoteCache = { data: fallback, ts: Date.now() }
    return fallback
  }
}

export async function fetchSectors(): Promise<SectorSnapshot[]> {
  if (isFresh(sectorCache)) return sectorCache!.data

  try {
    const res = await fetch('/api/market-data/sectors', {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) throw new Error('API error')
    const data = await res.json()

    if (data.fallback) {
      const fallback = SEED_SECTORS.map(sector => ({ ...sector, status: 'simulated' as const }))
      sectorCache = { data: fallback, ts: Date.now() }
      return fallback
    }

    const sectors: SectorSnapshot[] = Object.entries(data.sectors ?? {}).map(
      ([sector, info]: [string, any]) => ({
        sector,
        returnPct: info.return_pct ?? 0,
        volatility: info.volatility ?? 0,
        tickers: info.tickers ?? [],
      }),
    )

    const available = sectors.length > 0 ? sectors.map(sector => ({ ...sector, status: 'provider-backed' as const })) : []
    sectorCache = { data: available, ts: Date.now() }
    return sectorCache.data
  } catch {
    const fallback = SEED_SECTORS.map(sector => ({ ...sector, status: 'simulated' as const }))
    sectorCache = { data: fallback, ts: Date.now() }
    return fallback
  }
}

/** Get a single quote by symbol (from cache or fetch all). */
export async function fetchQuote(symbol: string): Promise<MarketQuote | null> {
  const quotes = await fetchQuotes()
  return quotes.find(q => q.symbol === symbol) ?? null
}

export async function fetchMarketObservation(symbol: string, signal?: AbortSignal): Promise<MarketObservation> {
  const clean = symbol.trim().toUpperCase()
  try {
    const response = await fetch(`/api/market-data/quote/${encodeURIComponent(clean)}`, { signal })
    if (response.ok) {
      const data = await response.json() as Record<string, unknown>
      if (data && data.status === 'provider-backed' && typeof data.price === 'number') {
        return {
          symbol: clean,
          assetType: 'equity',
          price: data.price,
          change: typeof data.change === 'number' ? data.change : null,
          changePercent: typeof data.change_percent === 'number' ? data.change_percent : null,
          currency: typeof data.currency === 'string' ? data.currency : 'USD',
          timestamp: typeof data.timestamp === 'string' ? data.timestamp : null,
          provider: typeof data.provider === 'string' ? data.provider : 'yfinance',
          freshness: String(data.freshness ?? 'current'),
          status: 'provider-backed',
        }
      }
    }
  } catch {
    // network or abort
  }

  // Fallback to seed quote so UI is populated with meaningful market indicators
  const seed = SEED_QUOTES.find(q => q.symbol === clean)
  if (seed) {
    return {
      symbol: clean,
      assetType: 'equity',
      price: seed.price,
      change: (seed.price * seed.changePct) / 100,
      changePercent: seed.changePct,
      currency: 'USD',
      timestamp: seed.timestamp,
      provider: 'simulated-feed',
      freshness: 'simulated',
      status: 'simulated',
    }
  }

  return {
    symbol: clean,
    assetType: 'equity',
    price: null,
    change: null,
    changePercent: null,
    currency: 'USD',
    timestamp: null,
    provider: null,
    freshness: 'unknown',
    status: 'unavailable',
  }
}

export async function fetchMarketHistory(symbol: string, interval = 'daily', signal?: AbortSignal): Promise<MarketHistoryObservation> {
  try {
    const response = await fetch(`/api/market-data/history/${encodeURIComponent(symbol)}?interval=${interval}`, { signal })
    if (!response.ok) throw new Error('History unavailable')
    const data = await response.json() as MarketHistoryObservation
    return {
      status: data.status === 'provider-backed' ? 'provider-backed' : 'unavailable',
      symbol: String(data.symbol ?? symbol).toUpperCase(),
      interval: data.interval ?? interval,
      provider: typeof data.provider === 'string' ? data.provider : null,
      freshness: data.freshness ?? 'unknown',
      timestamp: data.timestamp ?? null,
      history: Array.isArray(data.history) ? data.history.map((row: any) => ({
        date: String(row.date ?? ''),
        open: Number(row.open ?? 0),
        high: Number(row.high ?? 0),
        low: Number(row.low ?? 0),
        close: Number(row.close ?? 0),
        volume: Number(row.volume ?? 0),
        provider: typeof row.provider === 'string' ? row.provider : null,
      })) : [],
      limitations: Array.isArray(data.limitations) ? data.limitations : [],
    }
  } catch {
    return { status: 'unavailable', symbol: symbol.toUpperCase(), interval, freshness: 'unknown', history: [], limitations: ['Historical market data unavailable.'] }
  }
}

/** Invalidate all caches (e.g., after a manual refresh). */
export function invalidateMarketCache(): void {
  quoteCache = null
  sectorCache = null
}

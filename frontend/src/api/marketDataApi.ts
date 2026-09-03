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
}

export interface SectorSnapshot {
  sector: string
  returnPct: number
  volatility: number
  tickers: string[]
}

const CACHE_TTL = 5 * 60 * 1000
let quoteCache: { data: MarketQuote[]; ts: number } | null = null
let sectorCache: { data: SectorSnapshot[]; ts: number } | null = null

function isFresh(cache: { ts: number } | null): boolean {
  return cache !== null && Date.now() - cache.ts < CACHE_TTL
}

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

const SEED_QUOTES: MarketQuote[] = [
  { symbol: 'NVDA', name: 'NVIDIA', price: 182.4, changePct: 4.8, timestamp: new Date().toISOString() },
  { symbol: 'AAPL', name: 'Apple', price: 231.2, changePct: -1.2, timestamp: new Date().toISOString() },
  { symbol: 'MSFT', name: 'Microsoft', price: 448.6, changePct: 1.3, timestamp: new Date().toISOString() },
  { symbol: 'TSLA', name: 'Tesla', price: 312.8, changePct: -2.1, timestamp: new Date().toISOString() },
  { symbol: 'AMZN', name: 'Amazon', price: 198.4, changePct: 0.8, timestamp: new Date().toISOString() },
  { symbol: 'GOOGL', name: 'Alphabet', price: 178.9, changePct: 1.1, timestamp: new Date().toISOString() },
  { symbol: 'META', name: 'Meta', price: 512.3, changePct: 2.4, timestamp: new Date().toISOString() },
  { symbol: 'XOM', name: 'Exxon Mobil', price: 118.6, changePct: 3.1, timestamp: new Date().toISOString() },
  { symbol: 'SHEL', name: 'Shell', price: 72.9, changePct: 2.7, timestamp: new Date().toISOString() },
  { symbol: 'TSM', name: 'TSMC ADR', price: 214.8, changePct: -2.4, timestamp: new Date().toISOString() },
  { symbol: 'GC', name: 'Gold', price: 2482.1, changePct: 1.9, timestamp: new Date().toISOString() },
]

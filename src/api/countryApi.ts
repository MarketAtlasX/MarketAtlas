import axios from 'axios'
import type { Country } from '../data/countries'
import { countries } from '../data/countries'
import type { TradeRoute, MilitaryRelation, PortData } from '../data/relations'
import {
  tradeRoutes as localTradeRoutes,
  militaryRelations as localMilitaryRelations,
  portLocations as localPortLocations,
  getTradeRoutesForCountry,
  getMilitaryRelationsForCountry,
  getPortsForCountry,
} from '../data/relations'

const api = axios.create({
  baseURL: '/api',
  timeout: 2000,
})

let backendAvailable: boolean | null = null
let checkingBackend = false
let checkQueue: Array<(v: boolean) => void> = []

let tickerMapPromise: Promise<Map<string, number[]>> | null = null

async function loadTickerMap(): Promise<Map<string, number[]>> {
  const map = new Map<string, number[]>()
  const online = await checkBackend()
  if (!online) return map
  try {
    const { data } = await api.get<{ items: Array<{ id: number; ticker_symbols?: string | null }> }>('/entities?limit=1000')
    for (const item of data.items ?? []) {
      for (const symbol of (item.ticker_symbols ?? '').split(',')) {
        const s = symbol.trim().toUpperCase()
        if (!s) continue
        const ids = map.get(s) ?? []
        if (!ids.includes(item.id)) ids.push(item.id)
        map.set(s, ids)
      }
    }
  } catch {
    return map
  }
  return map
}

export async function getEntityIdsForTicker(ticker: string): Promise<number[]> {
  if (!ticker) return []
  if (!tickerMapPromise) {
    tickerMapPromise = loadTickerMap()
  }
  try {
    const map = await tickerMapPromise
    return map.get(ticker.toUpperCase()) ?? []
  } catch {
    tickerMapPromise = null
    return []
  }
}

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

export async function fetchCountries(): Promise<Country[]> {
  const online = await checkBackend()
  if (!online) return countries
  try {
    const { data } = await api.get<Country[]>('/countries')
    return data
  } catch {
    backendAvailable = false
    return countries
  }
}

export async function fetchCountry(code: string): Promise<Country | null> {
  const online = await checkBackend()
  if (!online) return countries.find(c => c.code === code) ?? null
  try {
    const { data } = await api.get<Country>(`/countries/${code}`)
    return data
  } catch {
    backendAvailable = false
    return countries.find(c => c.code === code) ?? null
  }
}

export async function fetchTradeRoutes(code: string): Promise<TradeRoute[]> {
  const online = await checkBackend()
  if (!online) return getTradeRoutesForCountry(code)
  try {
    const { data } = await api.get<TradeRoute[]>(`/countries/${code}/relations/trade`)
    return data
  } catch {
    backendAvailable = false
    return getTradeRoutesForCountry(code)
  }
}

export async function fetchMilitaryRelations(code: string): Promise<MilitaryRelation[]> {
  const online = await checkBackend()
  if (!online) return getMilitaryRelationsForCountry(code)
  try {
    const { data } = await api.get<MilitaryRelation[]>(`/countries/${code}/relations/military`)
    return data
  } catch {
    backendAvailable = false
    return getMilitaryRelationsForCountry(code)
  }
}

export async function fetchPorts(code: string): Promise<PortData[]> {
  const online = await checkBackend()
  if (!online) return getPortsForCountry(code)
  try {
    const { data } = await api.get<PortData[]>(`/countries/${code}/ports`)
    return data
  } catch {
    backendAvailable = false
    return getPortsForCountry(code)
  }
}

export async function fetchAllTradeRoutes(): Promise<TradeRoute[]> {
  const online = await checkBackend()
  if (!online) return localTradeRoutes
  try {
    const { data } = await api.get<TradeRoute[]>('/relations/trade')
    return data
  } catch {
    backendAvailable = false
    return localTradeRoutes
  }
}

export async function fetchAllMilitaryRelations(): Promise<MilitaryRelation[]> {
  const online = await checkBackend()
  if (!online) return localMilitaryRelations
  try {
    const { data } = await api.get<MilitaryRelation[]>('/relations/military')
    return data
  } catch {
    backendAvailable = false
    return localMilitaryRelations
  }
}

export async function fetchAllPorts(): Promise<PortData[]> {
  const online = await checkBackend()
  if (!online) return localPortLocations
  try {
    const { data } = await api.get<PortData[]>('/ports')
    return data
  } catch {
    backendAvailable = false
    return localPortLocations
  }
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { events } from '../data/events'
import { worldStates } from '../data/worldState'
import type { LiveEvent, MarketSignal, GraphLink, RiskUpdate, AgentStatus, WorldRisk, WorldStoreState } from '../types'
import { buildInitialAgents } from '../features/agents/agents'

export function countryName(code: string): string {
  return worldStates.find(w => w.code === code)?.name ?? code
}

/**
 * Hard cap on retained events. Every write path funnels through this bound so
 * a long-lived session can never grow the event feed without limit in memory.
 */
export const MAX_EVENTS = 40

export function riskColor(score: number): string {
  if (score < 30) return '#2ee6a8'
  if (score < 50) return '#f5b941'
  if (score < 70) return '#ff8a3d'
  return '#ff4d5e'
}

function seedSignals(): MarketSignal[] {
  return [
    { symbol: 'NVDA', name: 'NVIDIA', price: 182.4, changePct: 4.8, direction: 'UP', confidence: 0.82, context: 'Taiwan → TSMC → chip supply' },
    { symbol: 'XOM', name: 'Exxon Mobil', price: 118.6, changePct: 3.1, direction: 'UP', confidence: 0.74, context: 'Iran → Oil → Energy' },
    { symbol: 'AAPL', name: 'Apple', price: 231.2, changePct: -1.2, direction: 'DOWN', confidence: 0.66, context: 'Taiwan → supply chain risk' },
    { symbol: 'SHEL', name: 'Shell', price: 72.9, changePct: 2.7, direction: 'UP', confidence: 0.71, context: 'Brent ▲ 6.2%' },
    { symbol: 'TSMC', name: 'TSMC ADR', price: 214.8, changePct: -2.4, direction: 'DOWN', confidence: 0.79, context: 'Strait escalation' },
    { symbol: 'GC', name: 'Gold', price: 2482.1, changePct: 1.9, direction: 'UP', confidence: 0.68, context: 'Risk-off flows' },
  ]
}

function seedEvents(): LiveEvent[] {
  return events
    .filter(e => !e.isHistorical)
    .slice(0, 8)
    .map(e => ({
      id: e.id,
      title: e.title,
      countryCode: e.countryCode,
      country: countryName(e.countryCode),
      type: e.type,
      severity: e.severity,
      lat: e.lat,
      lng: e.lng,
      timestamp: e.timestamp,
      summary: e.description,
      sectors: e.affectedSectors,
      provenance: 'simulated',
    }))
}

function seedRisk(): RiskUpdate[] {
  return worldStates
    .filter(w => w.riskScore >= 55)
    .sort((a, b) => b.riskScore - a.riskScore)
    .map(w => ({ entity: w.name, risk: w.riskScore / 100, timestamp: new Date().toISOString() }))
}

function computeWorldRisk(risk: RiskUpdate[]): WorldRisk {
  const top = [...risk].sort((a, b) => b.risk - a.risk)
  const score = Math.round((top.reduce((s, r) => s + r.risk, 0) / Math.max(1, top.length)) * 100)
  const level = score >= 75 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 40 ? 'ELEVATED' : 'LOW'
  return {
    score,
    level,
    drivers: top.slice(0, 5).map(r => ({ entity: r.entity, score: Math.round(r.risk * 100) })),
  }
}

interface ApiEvent {
  id?: number | string
  title?: string
  description?: string
  event_type?: string
  sub_type?: string
  severity?: number | string
  status?: string
  event_date?: string
  first_seen_at?: string
  created_at?: string
  lat?: number | null
  lng?: number | null
  country_code?: string | null
  country?: string | null
}

function normalizeEventType(value: string | undefined): LiveEvent['type'] {
  const type = value?.toLowerCase()
  if (type === 'conflict' || type === 'election' || type === 'sanction' || type === 'trade' || type === 'diplomatic' || type === 'military' || type === 'economic' || type === 'natural' || type === 'market') {
    return type
  }
  return 'economic'
}

function normalizeSeverity(value: number | string | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(1, Math.min(10, Math.round(value)))
  if (typeof value === 'string') {
    const levels: Record<string, number> = { low: 2, medium: 5, high: 8, critical: 10 }
    const label = levels[value.toLowerCase()]
    if (label !== undefined) return label
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return Math.max(1, Math.min(10, Math.round(parsed)))
  }
  return null
}

function normalizeCoord(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function firstParseableTimestamp(values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed && !Number.isNaN(Date.parse(trimmed))) return trimmed
  }
  return null
}

/**
 * Map a `/api/events` row into the canonical shape without inventing anything:
 * an event missing an id, title, severity, or parseable timestamp is dropped,
 * and missing coordinates/location stay empty instead of being defaulted.
 */
function mapApiEvent(event: ApiEvent): LiveEvent | null {
  const id = event.id === undefined || event.id === null ? '' : String(event.id).trim()
  const title = event.title?.trim()
  if (!id || !title) return null

  const severity = normalizeSeverity(event.severity)
  if (severity === null) return null

  const timestamp = firstParseableTimestamp([event.event_date, event.first_seen_at, event.created_at])
  if (!timestamp) return null

  const countryCode = event.country_code?.trim().toUpperCase() ?? ''
  const country = event.country?.trim() || (countryCode ? countryName(countryCode) : '')

  return {
    id,
    title,
    countryCode,
    country,
    type: normalizeEventType(event.sub_type ?? event.event_type),
    severity,
    lat: normalizeCoord(event.lat),
    lng: normalizeCoord(event.lng),
    timestamp,
    summary: event.description?.trim() ?? '',
    sectors: [],
    provenance: 'live',
    status: event.status?.trim() || undefined,
  }
}

function seedGraph(): GraphLink[] {
  return [
    { source: 'Iran', target: 'Europe', influence: 0.71, label: 'Oil impact' },
    { source: 'Iran', target: 'Oil', influence: 0.83, label: 'supply risk' },
    { source: 'Oil', target: 'Energy', influence: 0.78, label: 'sector' },
    { source: 'Energy', target: 'XOM', influence: 0.66, label: 'earnings' },
    { source: 'Taiwan', target: 'TSMC', influence: 0.84, label: 'semiconductor' },
    { source: 'TSMC', target: 'NVIDIA', influence: 0.83, label: 'supply' },
    { source: 'NVIDIA', target: 'NASDAQ', influence: 0.61, label: 'index' },
    { source: 'China', target: 'Rare Earth', influence: 0.77, label: 'export controls' },
    { source: 'Rare Earth', target: 'Electronics', influence: 0.72, label: 'materials' },
    { source: 'Russia', target: 'Natural Gas', influence: 0.8, label: 'pipeline' },
  ]
}

interface WorldStoreApi {
  state: WorldStoreState
  selectEntity: (entity: string | null) => void
  pushEvent: (e: LiveEvent) => void
  /**
   * Apply a backend lifecycle status to an event already in the feed (e.g. a
   * `live_event_resolved` broadcast). A no-op when the id is not present, so a
   * resolution can never create or duplicate an entry.
   */
  setEventStatus: (id: string, status: string) => void
  pushRisk: (r: RiskUpdate) => void
  pushForecast: (f: WorldStoreState['forecast']) => void
}

const WorldContext = createContext<WorldStoreApi | null>(null)

export function WorldProvider({ children }: { children: ReactNode }) {
  const initial = useMemo<WorldStoreState>(() => {
    // Always seed initial data so the UI renders immediately.
    // When the backend WebSocket connects, live data overrides seed data
    // via pushEvent/pushRisk/pushForecast (dataMode switches to 'live').
    const risk = seedRisk()
    return {
      events: seedEvents(),
      signals: seedSignals(),
      riskUpdates: risk,
      graphLinks: seedGraph(),
      agents: buildInitialAgents(),
      worldRisk: computeWorldRisk(risk),
      selectedEntity: null,
      dataMode: 'simulated',
      updatedAt: null,
      forecast: { symbol: 'NVDA', bullish: 14.2, base: 6.8, bearish: -11.4, confidence: 82 },
    }
  }, [])

  const [state, setState] = useState<WorldStoreState>(initial)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 4000)

    // Bootstrap from the canonical live-event feed, not the raw `/api/events`
    // store: only live events carry the coordinates/country the timeline needs
    // to focus the globe, so raw rows would render as an all-disabled feed.
    fetch('/api/live-events?limit=40', { signal: controller.signal })
      .then(response => (response.ok ? response.json() as Promise<{ items?: ApiEvent[] }> : null))
      .then(payload => {
        const items = payload?.items ?? []
        if (items.length === 0) return
        const liveEvents = items
          .map(mapApiEvent)
          .filter((event): event is LiveEvent => event !== null)
          .slice(0, MAX_EVENTS)
        if (liveEvents.length === 0) return
        setState(current => {
          // Drop the simulated seed feed, but keep any genuinely live events a
          // WebSocket already delivered while this bootstrap was in flight —
          // replacing the whole list here would silently lose them. Dedupe by
          // id (REST and the socket describe some of the same stories) and
          // keep the bounded newest-first set.
          const socketLive = current.events.filter(event => event.provenance === 'live')
          const seen = new Set<string>()
          const merged: LiveEvent[] = []
          for (const event of [...socketLive, ...liveEvents]) {
            if (seen.has(event.id)) continue
            seen.add(event.id)
            merged.push(event)
          }
          return {
            ...current,
            events: merged.slice(0, MAX_EVENTS),
            dataMode: 'live',
            updatedAt: current.updatedAt ?? new Date().toISOString(),
          }
        })
      })
      .catch(() => {
        // Seeded events remain available when the backend is offline.
      })
      .finally(() => {
        window.clearTimeout(timeout)
      })

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [])

  const pushEvent = useCallback((e: LiveEvent) => {
    setState(s => ({ ...s, events: [e, ...s.events].slice(0, MAX_EVENTS), dataMode: 'live', updatedAt: e.timestamp }))
  }, [])

  const setEventStatus = useCallback((id: string, status: string) => {
    setState(s => {
      let changed = false
      const events = s.events.map(event => {
        if (event.id !== id || event.status === status) return event
        changed = true
        return { ...event, status }
      })
      return changed ? { ...s, events } : s
    })
  }, [])

  const pushRisk = useCallback((r: RiskUpdate) => {
    setState(s => {
      const next = [r, ...s.riskUpdates.filter(x => x.entity !== r.entity)].slice(0, 10)
      return { ...s, riskUpdates: next, worldRisk: computeWorldRisk(next), dataMode: 'live', updatedAt: r.timestamp }
    })
  }, [])

  const pushForecast = useCallback((f: WorldStoreState['forecast']) => {
    setState(s => ({ ...s, forecast: f, dataMode: 'live', updatedAt: new Date().toISOString() }))
  }, [])

  const selectEntity = useCallback((entity: string | null) => {
    // Re-selecting the same entity is a no-op: the globe focus path emits the
    // selection on both the store and the intelligence bus, and an unchanged
    // value must not trigger a second render or a redundant evidence effect.
    setState(s => (s.selectedEntity === entity ? s : { ...s, selectedEntity: entity }))
  }, [])

  return (
    <WorldContext.Provider value={{ state, selectEntity, pushEvent, setEventStatus, pushRisk, pushForecast }}>
      {children}
    </WorldContext.Provider>
  )
}

export function useWorldStore(): WorldStoreApi {
  const ctx = useContext(WorldContext)
  if (!ctx) throw new Error('useWorldStore must be used within WorldProvider')
  return ctx
}

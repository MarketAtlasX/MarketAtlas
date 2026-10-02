import { useEffect, useRef } from 'react'
import { useWorldStore } from '../../stores/WorldStore'
import { countryName } from '../../stores/WorldStore'
import type { LiveEvent, LiveEventType } from '../../types'

interface InboundMessage {
  type?: string
  event?: string
  entity?: string
  risk?: number
  symbol?: string
  direction?: 'UP' | 'DOWN'
  expected_return?: number
  confidence?: number
  source?: string
  target?: string
  influence?: number
  timestamp?: string
  title?: string
  id?: string | number
  description?: string
  countryCode?: string
  severity?: number | string
  lat?: number
  lng?: number
  country_code?: string | null
  region?: string | null
  event_type?: string | null
  sub_type?: string | null
  source_url?: string | null
  event_date?: string | null
  first_seen_at?: string | null
  status?: string | null
  data?: Record<string, unknown>
}

export interface UseLiveWorldSocketOptions {
  /**
   * Invoked exactly once per validated, deduplicated event received from the
   * backend. Used to refresh canonical evidence for the current selection —
   * the socket remains the only ingestion path (no new bus or socket).
   */
  onLiveEvent?: (event: LiveEvent) => void
}

/** Channels published by the backend `/ws` broadcaster. */
const WORLD_CHANNELS = ['signals', 'events', 'risk', 'forecasts', 'live_events']

const MAX_RECONNECT_ATTEMPTS = 4
const RECONNECT_BASE_MS = 5000
/** Bounded dedup memory so long sessions cannot grow without limit. */
const SEEN_EVENT_CAP = 500

/**
 * Backend event vocabulary → the frontend `LiveEventType` union. Mirrors the
 * REST normalization in `WorldStore.mapApiEvent` (unknown → 'economic'); no
 * value outside the existing union is ever produced.
 */
const EVENT_TYPE_MAP: Record<string, LiveEventType> = {
  conflict: 'conflict',
  military_conflict: 'military',
  military: 'military',
  sanction: 'sanction',
  election: 'election',
  trade_policy: 'trade',
  trade: 'trade',
  diplomatic: 'diplomatic',
  diplomatic_tension: 'diplomatic',
  geopolitical: 'diplomatic',
  economic_data: 'economic',
  economic: 'economic',
  corporate: 'economic',
  regulatory: 'economic',
  regulatory_change: 'economic',
  natural_disaster: 'natural',
  natural: 'natural',
  market_moving: 'market',
  market_move: 'market',
  market: 'market',
  other: 'economic',
}

const SEVERITY_LABELS: Record<string, number> = { low: 2, medium: 5, high: 8, critical: 10 }

function normalizeSeverity(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.min(10, Math.round(value)))
  }
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase()
    if (trimmed in SEVERITY_LABELS) return SEVERITY_LABELS[trimmed]
    if (trimmed) {
      const parsed = Number(trimmed)
      if (Number.isFinite(parsed)) return Math.max(1, Math.min(10, Math.round(parsed)))
    }
  }
  return null
}

function mapEventType(subType: unknown, eventType: unknown): LiveEventType {
  const fromSub = typeof subType === 'string' ? EVENT_TYPE_MAP[subType.trim().toLowerCase()] : undefined
  if (fromSub) return fromSub
  const fromEvent = typeof eventType === 'string' ? EVENT_TYPE_MAP[eventType.trim().toLowerCase()] : undefined
  return fromEvent ?? 'economic'
}

function nonEmpty(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

export interface ParsedLiveEvent {
  event: LiveEvent
  /**
   * Identity keys used to drop duplicates across reconnects and across the
   * backend's dual `live_events` / `events` broadcasts of the same article.
   */
  dedupKeys: string[]
}

/**
 * Strictly validate and map one backend event envelope into the canonical
 * `LiveEvent` shape. Returns `null` for anything the backend did not fully
 * describe — missing id/title/severity, missing coordinates, or a missing /
 * unparseable timestamp are dropped rather than filled with invented values.
 */
export function parseLiveEventEnvelope(envelope: InboundMessage): ParsedLiveEvent | null {
  const payload: InboundMessage = envelope.data && typeof envelope.data === 'object'
    ? { ...envelope, ...envelope.data }
    : envelope

  const rawId = payload.id ?? (envelope as InboundMessage).id
  const id = typeof rawId === 'string' || typeof rawId === 'number' ? String(rawId).trim() : ''
  if (!id) return null

  const title = nonEmpty(payload.title)
  if (!title) return null

  const severity = normalizeSeverity(payload.severity)
  if (severity === null) return null

  // Coordinates must come from the backend; an event without them is not
  // placed on the globe with invented positions.
  const lat = typeof payload.lat === 'number' && Number.isFinite(payload.lat) ? payload.lat : null
  const lng = typeof payload.lng === 'number' && Number.isFinite(payload.lng) ? payload.lng : null
  if (lat === null || lng === null) return null

  const timestamp = [payload.event_date, payload.first_seen_at, envelope.timestamp, payload.timestamp]
    .map(value => nonEmpty(value))
    .find((value): value is string => value !== null)
  if (!timestamp || Number.isNaN(Date.parse(timestamp))) return null

  const countryCode = nonEmpty(payload.country_code) ?? nonEmpty(payload.countryCode) ?? ''
  const description = nonEmpty(payload.description)
  const sourceUrl = nonEmpty(payload.source_url)

  const event: LiveEvent = {
    id,
    title,
    countryCode,
    country: countryCode ? countryName(countryCode) : '',
    type: mapEventType(payload.sub_type, payload.event_type),
    severity,
    lat,
    lng,
    timestamp,
    summary: description ?? title,
    sectors: [],
    provenance: 'live',
    status: nonEmpty(payload.status) ?? undefined,
  }

  const dedupKeys = [
    `id:${id}`,
    // The backend broadcasts the same article on both the `live_events` and
    // `events` channels with different ids — the title identifies the story.
    `title:${title.toLowerCase()}`,
    ...(sourceUrl ? [`url:${sourceUrl}`] : []),
  ]

  return { event, dedupKeys }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Does a backend event affect the currently selected entity? Matched only on
 * backend-provided facts: the event's country code/name, or a word-boundary
 * mention of the selection in its title/summary. Never inferred beyond that.
 */
export function eventAffectsSelection(event: LiveEvent, selection: string | null): boolean {
  if (!selection || !selection.trim()) return false
  const target = selection.trim().toLowerCase()
  if (event.countryCode && event.countryCode.trim().toLowerCase() === target) return true
  if (event.country && event.country.trim().toLowerCase() === target) return true
  const pattern = new RegExp(`\\b${escapeRegExp(target)}\\b`, 'i')
  return pattern.test(event.title) || pattern.test(event.summary)
}

export function useLiveWorldSocket(options: UseLiveWorldSocketOptions = {}) {
  const { pushEvent, setEventStatus, pushRisk, pushForecast, selectEntity } = useWorldStore()
  const handlersRef = useRef({ pushEvent, setEventStatus, pushRisk, pushForecast, selectEntity })
  handlersRef.current = { pushEvent, setEventStatus, pushRisk, pushForecast, selectEntity }
  const optionsRef = useRef(options)
  optionsRef.current = options
  const seenEventsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const sockets: WebSocket[] = []
    let disposed = false

    /** Remember an event's identity keys, evicting the oldest beyond the cap. */
    const remember = (keys: string[]): boolean => {
      const seen = seenEventsRef.current
      if (keys.some(key => seen.has(key))) return false
      for (const key of keys) seen.add(key)
      while (seen.size > SEEN_EVENT_CAP) {
        const oldest = seen.values().next().value
        if (oldest === undefined) break
        seen.delete(oldest)
      }
      return true
    }

    /** Validate, deduplicate, and publish one backend event to the stores. */
    const ingestEvent = (envelope: InboundMessage) => {
      const parsed = parseLiveEventEnvelope(envelope)
      if (!parsed || !remember(parsed.dedupKeys)) return
      handlersRef.current.pushEvent(parsed.event)
      optionsRef.current?.onLiveEvent?.(parsed.event)
    }

    /**
     * Connect with bounded exponential-ish backoff: the retry counter resets
     * on every healthy open, gives up after MAX consecutive failed attempts,
     * and never reconnects after the effect has been disposed.
     */
    const retryTimers = new Set<number>()

    const attachWithRetry = (url: string, onOpen: (ws: WebSocket) => void, onMessage: (raw: string) => void) => {
      let attempts = 0
      const scheduleRetry = () => {
        if (disposed || attempts >= MAX_RECONNECT_ATTEMPTS) return
        attempts += 1
        const timer = window.setTimeout(() => {
          retryTimers.delete(timer)
          attach()
        }, RECONNECT_BASE_MS * attempts)
        retryTimers.add(timer)
      }
      const attach = () => {
        if (disposed) return
        let ws: WebSocket
        try {
          ws = new WebSocket(url)
        } catch {
          // A failed construction (backend down) must retry like a close does,
          // otherwise a page loaded before the backend starts never connects.
          scheduleRetry()
          return
        }
        sockets.push(ws)
        ws.onopen = () => {
          attempts = 0
          onOpen(ws)
        }
        ws.onmessage = e => {
          try {
            onMessage(typeof e.data === 'string' ? e.data : '')
          } catch {
            /* ignore malformed frames */
          }
        }
        ws.onclose = () => scheduleRetry()
      }
      attach()
    }

    attachWithRetry(
      '/ws',
      ws => {
        WORLD_CHANNELS.forEach(channel => ws.send(JSON.stringify({ type: 'subscribe', channel })))
      },
      raw => {
        let envelope: InboundMessage
        try {
          envelope = JSON.parse(raw) as InboundMessage
        } catch {
          return
        }
        const payload = envelope.data && typeof envelope.data === 'object'
          ? { ...envelope, ...envelope.data }
          : envelope
        const h = handlersRef.current
        const type = String(envelope.type || envelope.event || payload.type || '').toUpperCase()

        if (type.includes('LIVE_EVENT')) {
          // Only genuinely new backend events become world-state entries.
          // Updates and resolutions of an event already on screen are not new
          // events and must not duplicate the list — they update the lifecycle
          // status of the existing entry (and are ignored when it is absent).
          if (type === 'LIVE_EVENT_NEW') {
            ingestEvent(envelope)
          } else if (type === 'LIVE_EVENT_RESOLVED' || type === 'LIVE_EVENT_UPDATE') {
            const rawId = payload.id ?? envelope.id
            const id = typeof rawId === 'string' || typeof rawId === 'number' ? String(rawId).trim() : ''
            if (id) {
              const status = nonEmpty(payload.status) ?? (type === 'LIVE_EVENT_RESOLVED' ? 'resolved' : 'updated')
              h.setEventStatus(id, status)
            }
          }
          return
        }

        if (type.includes('RISK') || type.includes('WORLD_STATE')) {
          if (payload.entity && typeof payload.risk === 'number') {
            h.pushRisk({ entity: String(payload.entity), risk: payload.risk, timestamp: String(envelope.timestamp || payload.timestamp || new Date().toISOString()) })
          }
        } else if (type.includes('FORECAST') || type.includes('MARKET')) {
          if (payload.symbol && typeof payload.expected_return === 'number') {
            const ret = payload.expected_return
            h.pushForecast({
              symbol: String(payload.symbol),
              bullish: Math.round(ret * 100 * 1.4 * 10) / 10,
              base: Math.round(ret * 100 * 10) / 10,
              bearish: Math.round(ret * 100 * 0.4 * 10) / 10,
              confidence: Math.round((Number(payload.confidence ?? 0.75)) * 100),
            })
          }
        } else if (payload.title) {
          // Any other channel carrying a titled event goes through the same
          // strict validation and dedup path (`events` channel broadcasts).
          ingestEvent(envelope)
        }
      },
    )

    try {
      attachWithRetry(
        '/ws/graph',
        () => {},
        raw => {
          let envelope: InboundMessage
          try {
            envelope = JSON.parse(raw) as InboundMessage
          } catch {
            return
          }
          const payload = envelope.data && typeof envelope.data === 'object' ? { ...envelope, ...envelope.data } : envelope
          const type = (envelope.type || '').toUpperCase()
          const h = handlersRef.current
          if (type.includes('FORECAST') && payload.symbol && typeof payload.expected_return === 'number') {
            const ret = payload.expected_return
            h.pushForecast({
              symbol: String(payload.symbol),
              bullish: Math.round(ret * 1400) / 10,
              base: Math.round(ret * 1000) / 10,
              bearish: Math.round(ret * 400) / 10,
              confidence: Math.round(Number(payload.confidence ?? 0.75) * 100),
            })
          } else if (payload.source && payload.target) {
            h.selectEntity(String(payload.source))
          }
        },
      )
    } catch {
      /* graph service is optional */
    }

    return () => {
      disposed = true
      retryTimers.forEach(timer => window.clearTimeout(timer))
      retryTimers.clear()
      sockets.forEach(ws => {
        try {
          ws.close()
        } catch {
          /* already closed */
        }
      })
    }
  }, [])
}

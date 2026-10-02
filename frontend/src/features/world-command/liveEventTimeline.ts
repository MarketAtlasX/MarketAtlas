import type { LiveEvent, LiveEventProvenance, LiveEventType } from '../../types'

/**
 * Pure presentation helpers for the live-event timeline.
 *
 * These read only fields the backend actually provided — they never invent a
 * location, severity, or timestamp. Status that is *derived* (stale-by-age) is
 * derived from the event's real timestamp and is labelled as such.
 */

export type TimelineTone = 'critical' | 'warning' | 'accent' | 'positive' | 'neutral'

/** The lifecycle label rendered on each timeline entry. */
export type TimelineStatus = 'LIVE' | 'STALE' | 'RESOLVED' | 'UPDATED' | 'SIMULATED'

/** A backend event with no update after this window is rendered as stale. */
export const LIVE_STALE_AFTER_MS = 30 * 60 * 1000

export const TYPE_TONE: Record<LiveEventType, TimelineTone> = {
  conflict: 'critical',
  military: 'critical',
  sanction: 'warning',
  trade: 'positive',
  diplomatic: 'accent',
  economic: 'neutral',
  election: 'accent',
  natural: 'warning',
  market: 'positive',
}

const STATUS_TONE: Record<TimelineStatus, TimelineTone> = {
  LIVE: 'positive',
  STALE: 'warning',
  UPDATED: 'accent',
  RESOLVED: 'neutral',
  SIMULATED: 'neutral',
}

export function statusTone(status: TimelineStatus): TimelineTone {
  return STATUS_TONE[status]
}

export function severityTone(severity: number): TimelineTone {
  return severity >= 7 ? 'critical' : severity >= 5 ? 'warning' : 'accent'
}

/** Provenance defaults to simulated: only events explicitly ingested live. */
export function eventProvenance(event: LiveEvent): LiveEventProvenance {
  return event.provenance === 'live' ? 'live' : 'simulated'
}

function timestampMs(event: LiveEvent): number | null {
  const parsed = Date.parse(event.timestamp)
  return Number.isNaN(parsed) ? null : parsed
}

/**
 * Newest-first ordering by the backend-provided timestamp. Events with an
 * unparseable timestamp sink to the end rather than being dropped or assigned
 * an invented time.
 */
export function sortEventsNewestFirst(events: LiveEvent[]): LiveEvent[] {
  return events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => {
      const ta = timestampMs(a.event)
      const tb = timestampMs(b.event)
      if (ta === null && tb === null) return a.index - b.index
      if (ta === null) return 1
      if (tb === null) return -1
      if (tb !== ta) return tb - ta
      return a.index - b.index
    })
    .map(entry => entry.event)
}

export function eventStatus(event: LiveEvent, now: number = Date.now()): TimelineStatus {
  if (eventProvenance(event) !== 'live') return 'SIMULATED'
  const status = event.status?.trim().toLowerCase()
  if (status === 'resolved' || status === 'archived') return 'RESOLVED'
  if (status === 'updated') return 'UPDATED'
  const ts = timestampMs(event)
  if (ts !== null && now - ts > LIVE_STALE_AFTER_MS) return 'STALE'
  return 'LIVE'
}

/** Compact relative age: NOW, 5m, 3h, 2d. Empty string for no timestamp. */
export function formatEventAge(timestamp: string, now: number = Date.now()): string {
  const parsed = Date.parse(timestamp)
  if (Number.isNaN(parsed)) return ''
  const mins = Math.max(0, Math.round((now - parsed) / 60000))
  if (mins < 1) return 'NOW'
  if (mins < 60) return `${mins}m`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}

/**
 * Backend-provided location only. Returns `null` when the event carries no
 * location so the UI can render an explicit "location unavailable" state
 * instead of a fabricated one.
 */
export function eventLocation(event: LiveEvent): string | null {
  const location = event.country?.trim() || event.countryCode?.trim()
  return location || null
}

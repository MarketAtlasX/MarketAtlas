/**
 * Date and relative time formatting helpers.
 *
 * Backend timestamps are naive UTC — e.g. `"2026-10-03T03:22:44.507574"` with
 * no trailing `Z`. JavaScript parses a bare ISO date-time as *local* time, so a
 * timestamp that is minutes old can be shifted by the browser's whole UTC
 * offset (in IST, a 10-minute-old event looks ~5h40m old). That made every
 * live event render as STALE. `normalizeBackendTimestamp` marks an offset-less
 * backend datetime as UTC before parsing.
 */

export function normalizeBackendTimestamp(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  const hasTime = /\d{2}:\d{2}/.test(trimmed)
  const hasZone = /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(trimmed)
  if (hasTime && !hasZone) return `${trimmed}Z`
  return trimmed
}

export function parseBackendDate(dateInput: string | number | Date): Date {
  if (typeof dateInput === 'string') return new Date(normalizeBackendTimestamp(dateInput))
  return new Date(dateInput)
}

export function formatRelativeTime(dateInput: string | number | Date): string {
  const date = parseBackendDate(dateInput)
  if (Number.isNaN(date.getTime())) return 'unknown'
  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

export function formatIsoDate(dateInput: string | number | Date): string {
  const date = parseBackendDate(dateInput)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toISOString().split('T')[0]
}

export function isRecent(dateInput: string | number | Date, thresholdMinutes = 60): boolean {
  const date = parseBackendDate(dateInput)
  if (Number.isNaN(date.getTime())) return false
  return Date.now() - date.getTime() <= thresholdMinutes * 60 * 1000
}

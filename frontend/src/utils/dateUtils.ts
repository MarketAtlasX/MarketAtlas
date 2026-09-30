/**
 * Date and relative time formatting helpers.
 */

export function formatRelativeTime(dateInput: string | number | Date): string {
  const date = new Date(dateInput)
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
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toISOString().split('T')[0]
}

export function isRecent(dateInput: string | number | Date, thresholdMinutes = 60): boolean {
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) return false
  return Date.now() - date.getTime() <= thresholdMinutes * 60 * 1000
}

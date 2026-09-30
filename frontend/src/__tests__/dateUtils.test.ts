import { describe, it, expect } from 'vitest'
import { formatRelativeTime, formatIsoDate, isRecent } from '../utils/dateUtils'

describe('dateUtils', () => {
  it('formats relative time', () => {
    const now = Date.now()
    expect(formatRelativeTime(now - 10000)).toBe('10s ago')
    expect(formatRelativeTime(now - 120000)).toBe('2m ago')
    expect(formatRelativeTime(now - 7200000)).toBe('2h ago')
    expect(formatRelativeTime('invalid')).toBe('unknown')
  })

  it('formats ISO date', () => {
    expect(formatIsoDate('2026-09-30T12:00:00Z')).toBe('2026-09-30')
    expect(formatIsoDate('invalid')).toBe('--')
  })

  it('detects recent dates', () => {
    const now = Date.now()
    expect(isRecent(now - 1000 * 60 * 5, 10)).toBe(true)
    expect(isRecent(now - 1000 * 60 * 60, 10)).toBe(false)
  })
})

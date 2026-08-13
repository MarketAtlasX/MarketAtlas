import { describe, it, expect } from 'vitest'
import { formatCommandTime } from '../hooks/useClock'

describe('formatCommandTime', () => {
  it('formats a known date as a command-time string', () => {
    const d = new Date(2026, 7, 13, 9, 5)
    expect(formatCommandTime(d)).toBe('13 AUG 2026 09:05')
  })

  it('zero-pads day, hours and minutes', () => {
    const d = new Date(2026, 0, 1, 0, 0)
    expect(formatCommandTime(d)).toBe('01 JAN 2026 00:00')
  })

  it('uses uppercase month abbreviations', () => {
    const d = new Date(2026, 11, 25, 18, 45)
    expect(formatCommandTime(d)).toContain('DEC')
  })
})

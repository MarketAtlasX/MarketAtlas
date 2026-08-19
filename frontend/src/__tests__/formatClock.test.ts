import { describe, it, expect } from 'vitest'
import { formatCommandTime } from '../hooks/useClock'

describe('formatCommandTime', () => {
  it('pads day, hours, and minutes to two digits', () => {
    expect(formatCommandTime(new Date(2026, 0, 15, 9, 5))).toBe('15 JAN 2026 09:05')
  })

  it('maps every month to its abbreviation', () => {
    expect(formatCommandTime(new Date(2026, 0, 1, 0, 0))).toContain('JAN')
    expect(formatCommandTime(new Date(2026, 11, 31, 23, 59))).toBe('31 DEC 2026 23:59')
  })

  it('renders late-night times in 24-hour format', () => {
    expect(formatCommandTime(new Date(2026, 6, 4, 18, 30))).toBe('04 JUL 2026 18:30')
  })
})

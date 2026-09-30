import { describe, it, expect } from 'vitest'
import { formatCurrency, formatPercent, formatCompactNumber } from '../utils/formatters'

describe('formatters', () => {
  it('formats currency correctly', () => {
    expect(formatCurrency(123.45)).toBe('$123.45')
    expect(formatCurrency(null)).toBe('--')
    expect(formatCurrency(undefined)).toBe('--')
    expect(formatCurrency(NaN)).toBe('--')
  })

  it('formats percent correctly', () => {
    expect(formatPercent(4.56)).toBe('+4.56%')
    expect(formatPercent(-2.34)).toBe('-2.34%')
    expect(formatPercent(0)).toBe('0.00%')
    expect(formatPercent(null)).toBe('--')
  })

  it('formats compact numbers', () => {
    expect(formatCompactNumber(1500)).toBe('1.5K')
    expect(formatCompactNumber(2500000)).toBe('2.5M')
    expect(formatCompactNumber(null)).toBe('--')
  })
})

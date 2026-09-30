import { describe, it, expect } from 'vitest'
import { cleanTicker, isValidTicker, getSymbolDisplayName } from '../utils/tickerUtils'

describe('tickerUtils', () => {
  it('cleans ticker input', () => {
    expect(cleanTicker(' nvda ')).toBe('NVDA')
    expect(cleanTicker('aapl!@#')).toBe('AAPL')
    expect(cleanTicker('brk.b')).toBe('BRK.B')
  })

  it('validates ticker format', () => {
    expect(isValidTicker('NVDA')).toBe(true)
    expect(isValidTicker('MSFT')).toBe(true)
    expect(isValidTicker('')).toBe(false)
    expect(isValidTicker('VERYLONGTICKERNAME')).toBe(false)
  })

  it('retrieves symbol display names', () => {
    expect(getSymbolDisplayName('NVDA')).toBe('NVIDIA Corporation')
    expect(getSymbolDisplayName('AAPL')).toBe('Apple Inc.')
    expect(getSymbolDisplayName('UNKNOWN')).toBe('UNKNOWN Enterprise')
  })
})

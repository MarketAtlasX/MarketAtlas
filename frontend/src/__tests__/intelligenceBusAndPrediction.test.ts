import { describe, it, expect, vi } from 'vitest'
import { intelligenceBus } from '../services/intelligenceBus'
import { predictionBus } from '../features/prediction-space/predictionBus'
import { theme } from '../features/globe/globeTheme'
import { fetchQuotes, fetchSectors, invalidateMarketCache } from '../api/marketDataApi'

describe('intelligenceBus', () => {
  it('delivers events to subscribers', () => {
    const handler = vi.fn()
    const unsubscribe = intelligenceBus.subscribe(handler)

    intelligenceBus.emit('ENTITY_SELECTED', { entity: 'Taiwan' })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ENTITY_SELECTED',
        payload: { entity: 'Taiwan' },
      })
    )

    unsubscribe()
    intelligenceBus.emit('ENTITY_SELECTED', { entity: 'Germany' })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('maintains the current event', () => {
    intelligenceBus.emit('TICKER_REQUESTED', { ticker: 'NVDA' })
    expect(intelligenceBus.current).toMatchObject({
      type: 'TICKER_REQUESTED',
      payload: { ticker: 'NVDA' },
    })
  })
})

describe('predictionBus', () => {
  it('broadcasts prediction lifecycles', () => {
    const handler = vi.fn()
    const unsubscribe = predictionBus.subscribe(handler)

    predictionBus.emit('TICKER_SELECTED', 'TSMC')

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TICKER_SELECTED',
        ticker: 'TSMC',
      })
    )

    unsubscribe()
  })
})

describe('globeTheme', () => {
  it('specifies a dark command-center aesthetic', () => {
    expect(theme.globe.base).toBe('#030508')
    expect(theme.globe.opacity).toBeLessThan(1.0)
    expect(theme.atmosphere.altitude).toBe(0.06)
  })

  it('defines refined semantic colors for all polygon states', () => {
    expect(theme.polygon.stable.cap).toContain('rgba')
    expect(theme.polygon.conflict.cap).toContain('rgba')
    expect(theme.polygon.selected.stroke).toBe('#ffe600')
  })

  it('caps particle node radiuses for high-resolution intelligence rendering', () => {
    expect(theme.node.maxRadius).toBeLessThanOrEqual(0.08)
  })
})

describe('marketDataApi', () => {
  it('returns quotes fallback safely in offline/test environment', async () => {
    invalidateMarketCache()
    const quotes = await fetchQuotes()
    expect(quotes.length).toBeGreaterThan(0)
    expect(quotes.some(q => q.symbol === 'NVDA')).toBe(true)
    expect(quotes.some(q => q.symbol === 'AAPL')).toBe(true)
  })

  it('returns sector benchmarks safely', async () => {
    invalidateMarketCache()
    const sectors = await fetchSectors()
    expect(sectors.length).toBeGreaterThan(0)
    expect(sectors.some(s => s.sector === 'Technology')).toBe(true)
    expect(sectors.some(s => s.sector === 'Energy')).toBe(true)
  })
})

describe('companyLocations', () => {
  it('resolves headquarters and state location for key tickers', async () => {
    const { resolveCompanyLocation } = await import('../data/companyLocations')

    const nvda = resolveCompanyLocation('NVDA')
    expect(nvda).not.toBeNull()
    expect(nvda?.headquarters.city).toBe('Santa Clara')
    expect(nvda?.headquarters.state).toBe('California')
    expect(nvda?.headquarters.country).toBe('United States')
    expect(nvda?.coords.lat).toBeCloseTo(37.37, 1)
    expect(nvda?.facilities.length).toBeGreaterThan(0)

    const tsmc = resolveCompanyLocation('TSMC')
    expect(tsmc).not.toBeNull()
    expect(tsmc?.headquarters.city).toBe('Hsinchu')
    expect(tsmc?.headquarters.country).toBe('Taiwan')

    const aapl = resolveCompanyLocation('AAPL')
    expect(aapl).not.toBeNull()
    expect(aapl?.headquarters.city).toBe('Cupertino')
    expect(aapl?.headquarters.state).toBe('California')

    const xom = resolveCompanyLocation('XOM')
    expect(xom).not.toBeNull()
    expect(xom?.headquarters.state).toBe('Texas')
  })

  it('handles aliases gracefully', async () => {
    const { resolveCompanyLocation } = await import('../data/companyLocations')
    expect(resolveCompanyLocation('tsm')?.ticker).toBe('TSMC')
    expect(resolveCompanyLocation('nvidia')?.ticker).toBe('NVDA')
    expect(resolveCompanyLocation('apple')?.ticker).toBe('AAPL')
  })
})

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import ForecastChart, { generateSymbolData } from '../features/markets/ForecastChart'

describe('generateSymbolData', () => {
  it('produces history and forecast arrays of the expected lengths', () => {
    const data = generateSymbolData('NVDA')
    expect(data.history.length).toBe(78)
    expect(data.bull.length).toBe(30)
    expect(data.base.length).toBe(30)
    expect(data.bear.length).toBe(30)
    expect(data.price).toBeGreaterThan(0)
  })

  it('is deterministic for the same symbol', () => {
    const a = generateSymbolData('TSMC')
    const b = generateSymbolData('TSMC')
    expect(a.price).toBe(b.price)
  })
})

describe('ForecastChart', () => {
  const history = [100, 102, 101, 105, 108]
  const bull = [110, 114, 118]
  const base = [108, 110, 111]
  const bear = [104, 100, 96]

  it('renders a chart with the symbol-derived band gradient', () => {
    const { container } = render(<ForecastChart symbol="NVDA" history={history} bull={bull} base={base} bear={bear} />)
    expect(container.querySelector('svg')).not.toBeNull()
    expect(container.querySelector('#band-NVDA')).not.toBeNull()
  })

  it('renders a trend path and confidence band', () => {
    const { container } = render(<ForecastChart symbol="NVDA" history={history} bull={bull} base={base} bear={bear} />)
    expect(container.querySelectorAll('path').length).toBeGreaterThanOrEqual(2)
  })
})

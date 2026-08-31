import { describe, it, expect } from 'vitest'
import { inferVisualization } from '../assistant/brain/inferVisualization'

describe('inferVisualization', () => {
  it('returns globe mode for a plain country name', () => {
    const result = inferVisualization('Taiwan')
    expect(result.mode).toBe('country')
  })

  it('returns route mode for route queries', () => {
    const result = inferVisualization('Show me the route from India to Germany')
    expect(result.mode).toBe('route')
  })

  it('returns conflict mode for conflict queries', () => {
    const result = inferVisualization('Show me conflict zones')
    expect(result.mode).toBe('conflict')
  })

  it('returns risk mode for risk queries', () => {
    const result = inferVisualization('Show me the risk')
    expect(result.mode).toBe('risk')
  })

  it('returns map mode for map queries', () => {
    const result = inferVisualization('Show me the world map')
    expect(result.mode).toBe('map')
  })

  it('returns supply mode for supply chain queries', () => {
    const result = inferVisualization('Show me the supply chain')
    expect(result.mode).toBe('supply')
  })

  it('returns network mode for network queries', () => {
    const result = inferVisualization('Show me the network')
    expect(result.mode).toBe('network')
  })

  it('returns abstract mode for science queries', () => {
    const result = inferVisualization('Explain general relativity')
    expect(result.mode).toBe('abstract')
  })

  it('always returns a valid mode string', () => {
    const queries = [
      'Iran',
      'oil prices',
      'strait of hormuz',
      'semiconductor supply',
      'what is happening',
    ]
    for (const q of queries) {
      const result = inferVisualization(q)
      expect(result.mode).toBeTruthy()
      expect(typeof result.mode).toBe('string')
      expect(result.caption).toBeTruthy()
    }
  })
})

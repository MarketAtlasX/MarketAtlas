import { describe, it, expect } from 'vitest'
import { buildHeatmap } from '../features/globe/globeData'

describe('buildHeatmap', () => {
  const heat = buildHeatmap()

  it('emits a heat point per world state', () => {
    expect(heat.length).toBeGreaterThan(0)
  })

  it('normalizes intensity from risk score', () => {
    for (const h of heat) {
      expect(h.intensity).toBeGreaterThan(0)
      expect(h.intensity).toBeLessThanOrEqual(1)
    }
  })

  it('maps hot states to red and cold states to teal', () => {
    const hot = heat.find(h => h.intensity >= 0.7)
    if (hot) expect(hot.color).toBe('#ff4d5e')
    const cold = heat.find(h => h.intensity <= 0.39)
    if (cold) expect(cold.color).toBe('#1e5f7a')
  })

  it('resolves coordinates for every heat point', () => {
    for (const h of heat) {
      expect(typeof h.lat).toBe('number')
      expect(typeof h.lng).toBe('number')
    }
  })
})

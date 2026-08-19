import { describe, it, expect } from 'vitest'
import { buildMapLabels } from '../features/globe/globeData'

describe('buildMapLabels', () => {
  const labels = buildMapLabels()

  it('labels the major trade hubs', () => {
    const names = labels.map(l => l.text)
    expect(names).toContain('United States')
    expect(names).toContain('China')
  })

  it('sizes hub labels larger than hot states', () => {
    const us = labels.find(l => l.text === 'United States')
    expect(us?.size).toBe(0.16)
  })

  it('colors every label from the map palette', () => {
    const palette = ['#ff8a94', '#ffd98a', '#ffd54a', '#7adcff']
    for (const l of labels) {
      expect(palette).toContain(l.color)
    }
  })

  it('places every label inside the map plane', () => {
    for (const l of labels) {
      expect(Math.abs(l.x)).toBeLessThanOrEqual(5)
      expect(Math.abs(l.z)).toBeLessThanOrEqual(3.25)
    }
  })
})

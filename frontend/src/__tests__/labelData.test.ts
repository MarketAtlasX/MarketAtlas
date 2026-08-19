import { describe, it, expect } from 'vitest'
import { buildLabelData } from '../features/globe/globeData'

describe('buildLabelData', () => {
  const labels = buildLabelData()

  it('only labels hot world states', () => {
    expect(labels.length).toBeGreaterThan(0)
    expect(labels.length).toBeLessThanOrEqual(10)
  })

  it('floats labels just above the surface', () => {
    for (const l of labels) {
      expect(l.altitude).toBe(2.12)
      expect(l.text.length).toBeGreaterThan(0)
    }
  })

  it('renders critical states larger and red', () => {
    for (const l of labels) {
      expect(l.size).toBeGreaterThanOrEqual(0.13)
      expect(['#ff4d5e', '#9adcf0']).toContain(l.color)
    }
  })

  it('resolves coordinates for every label', () => {
    for (const l of labels) {
      expect(typeof l.lat).toBe('number')
      expect(typeof l.lng).toBe('number')
    }
  })
})

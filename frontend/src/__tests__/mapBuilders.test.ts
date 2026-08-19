import { describe, it, expect } from 'vitest'
import { buildMapCountryPoints, buildHubMapPoints, latLngToPlane } from '../features/globe/globeData'

describe('buildMapCountryPoints', () => {
  const pts = buildMapCountryPoints()

  it('emits one point per world state', () => {
    expect(pts.length).toBeGreaterThan(0)
  })

  it('colors points by risk band', () => {
    for (const p of pts) {
      expect(['#ff4d5e', '#f5b941', '#38e8ff']).toContain(p.color)
    }
  })

  it('scales point size with risk', () => {
    for (const p of pts) {
      expect(p.size).toBeGreaterThanOrEqual(0.05)
      expect(p.size).toBeLessThanOrEqual(0.13)
    }
  })
})

describe('buildHubMapPoints', () => {
  const hubs = buildHubMapPoints()

  it('covers every major trade hub', () => {
    const names = hubs.map(h => h.name)
    expect(names).toContain('Germany')
    expect(names).toContain('Japan')
    expect(names).toContain('India')
    expect(names).toContain('Brazil')
    expect(names).toContain('Saudi Arabia')
    expect(hubs).toHaveLength(7)
  })
})

describe('latLngToPlane', () => {
  it('maps the dateline to the right edge', () => {
    expect(latLngToPlane(0, 180, 10, 6.5).x).toBeCloseTo(5)
  })

  it('maps the south pole to the bottom edge', () => {
    expect(latLngToPlane(-90, 0, 10, 6.5).z).toBeCloseTo(3.25)
  })

  it('maps 90W to the left edge', () => {
    expect(latLngToPlane(0, -90, 10, 6.5).x).toBeCloseTo(-2.5)
  })
})

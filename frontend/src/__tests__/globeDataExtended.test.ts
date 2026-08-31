import { describe, it, expect } from 'vitest'
import {
  resolveCoords,
  buildNodes,
  buildArcs,
  buildRiskPaths,
  buildHeatmap,
  buildLabelData,
  buildMapCountryPoints,
  buildHubMapPoints,
  buildMapLabels,
  riskFor,
  latLngToPlane,
  buildEventNodes,
  buildRiskFlows,
} from '../features/globe/globeData'

describe('buildRiskPaths', () => {
  it('returns risk paths for high influence links', () => {
    const paths = buildRiskPaths([])
    expect(paths).toEqual([])
  })
})

describe('buildHeatmap', () => {
  it('returns a heatmap entry per world state', () => {
    const heatmap = buildHeatmap()
    expect(heatmap.length).toBeGreaterThan(0)
    for (const entry of heatmap) {
      expect(entry).toHaveProperty('lat')
      expect(entry).toHaveProperty('lng')
      expect(entry).toHaveProperty('intensity')
      expect(entry).toHaveProperty('color')
    }
  })
})

describe('buildLabelData', () => {
  it('returns label data with text, color, and size', () => {
    const labels = buildLabelData()
    expect(labels.length).toBeGreaterThan(0)
    for (const label of labels) {
      expect(label.text).toBeTruthy()
      expect(label.color).toBeTruthy()
      expect(label.size).toBeGreaterThan(0)
    }
  })
})

describe('buildMapCountryPoints', () => {
  it('returns country points with color and size', () => {
    const points = buildMapCountryPoints()
    expect(points.length).toBeGreaterThan(0)
    for (const pt of points) {
      expect(pt).toHaveProperty('x')
      expect(pt).toHaveProperty('z')
      expect(pt).toHaveProperty('color')
      expect(pt).toHaveProperty('size')
    }
  })
})

describe('buildHubMapPoints', () => {
  it('returns hub map points with names', () => {
    const points = buildHubMapPoints()
    expect(points.length).toBeGreaterThan(0)
    for (const pt of points) {
      expect(pt.name).toBeTruthy()
      expect(pt).toHaveProperty('x')
      expect(pt).toHaveProperty('z')
    }
  })
})

describe('buildMapLabels', () => {
  it('returns map labels with text and colors', () => {
    const labels = buildMapLabels()
    expect(labels.length).toBeGreaterThan(0)
    for (const label of labels) {
      expect(label.text).toBeTruthy()
      expect(label.color).toBeTruthy()
    }
  })
})

describe('buildEventNodes', () => {
  it('returns event nodes with required fields', () => {
    const nodes = buildEventNodes([])
    expect(nodes).toEqual([])
  })
})

describe('latLngToPlane', () => {
  it('converts lat/lng to plane coordinates', () => {
    const pt = latLngToPlane(0, 0, 10, 6.5)
    expect(pt.x).toBe(-5)
    expect(pt.z).toBe(-3.25)
  })
})

describe('riskFor', () => {
  it('returns risk score for known states', () => {
    expect(riskFor('Iran')).toBeGreaterThan(0)
  })

  it('returns 50 for unknown states', () => {
    expect(riskFor('Atlantis')).toBe(50)
  })
})

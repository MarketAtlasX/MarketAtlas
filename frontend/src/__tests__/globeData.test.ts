import { describe, it, expect } from 'vitest'
import { resolveCoords, buildNodes, buildArcs, buildRiskPaths, buildEventNodes, riskFor } from '../features/globe/globeData'
import type { GraphLink, LiveEvent } from '../types'

describe('resolveCoords', () => {
  it('resolves known entity coordinates', () => {
    expect(resolveCoords('Oil')).toEqual({ lat: 27.0, lng: 52.0 })
    expect(resolveCoords('NVIDIA')).toEqual({ lat: 37.4, lng: -122.0 })
  })

  it('returns null for unknown names', () => {
    expect(resolveCoords('Nope')).toBeNull()
  })
})

describe('riskFor', () => {
  it('returns stored risk for a known world state', () => {
    expect(riskFor('Iran')).toBeGreaterThan(0)
  })

  it('defaults to 50 for unknown states', () => {
    expect(riskFor('Nope')).toBe(50)
  })
})

describe('buildNodes', () => {
  it('builds a node per world state with required fields', () => {
    const nodes = buildNodes('world')
    expect(nodes.length).toBeGreaterThan(0)
    for (const n of nodes) {
      expect(n).toHaveProperty('lat')
      expect(n).toHaveProperty('lng')
      expect(n).toHaveProperty('label')
      expect(n).toHaveProperty('radius')
      expect(n).toHaveProperty('color')
    }
  })

  it('drops low-risk states outside world mode', () => {
    const all = buildNodes('world')
    const filtered = buildNodes('risk')
    expect(filtered.length).toBeLessThanOrEqual(all.length)
  })
})

describe('buildArcs', () => {
  it('skips links whose endpoints cannot be resolved', () => {
    const links: GraphLink[] = [{ source: 'Nope A', target: 'Nope B', influence: 0.9 }]
    expect(buildArcs(links)).toHaveLength(0)
  })

  it('maps resolved links to arc objects', () => {
    const links: GraphLink[] = [{ source: 'Oil', target: 'NVIDIA', influence: 0.8 }]
    const arcs = buildArcs(links)
    expect(arcs).toHaveLength(1)
    expect(arcs[0]).toMatchObject({ startLat: 27.0, startLng: 52.0, endLat: 37.4, endLng: -122.0 })
  })
})

describe('buildRiskPaths', () => {
  it('only keeps high-influence links', () => {
    const links: GraphLink[] = [
      { source: 'Oil', target: 'NVIDIA', influence: 0.8 },
      { source: 'Oil', target: 'AAPL', influence: 0.3 },
    ]
    expect(buildRiskPaths(links)).toHaveLength(1)
  })
})

describe('buildEventNodes', () => {
  const ev: LiveEvent = {
    id: 'e1',
    title: 'Escalation',
    countryCode: 'IR',
    country: 'Iran',
    type: 'conflict',
    severity: 8,
    lat: 33,
    lng: 51,
    timestamp: '2026-01-01T00:00:00Z',
    summary: 's',
    sectors: ['Oil'],
  }

  it('builds a pulsing node per live event', () => {
    const nodes = buildEventNodes([ev])
    expect(nodes).toHaveLength(1)
    expect(nodes[0].label).toBe('Iran')
    expect(nodes[0].entity).toBe('Iran')
    expect(nodes[0].radius).toBeGreaterThan(0.06)
  })
})

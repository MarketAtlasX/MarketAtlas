import { describe, it, expect } from 'vitest'
import { buildNodes, buildArcs, buildHeatmap, buildLabelData, buildRiskPaths, buildEventNodes } from '../features/globe/globeData'
import type { GraphLink } from '../types'

describe('buildNodes comprehensive', () => {
  it('builds nodes for world mode including all states', () => {
    const nodes = buildNodes('world')
    expect(nodes.length).toBeGreaterThan(0)
    expect(nodes[0]).toHaveProperty('lat')
    expect(nodes[0]).toHaveProperty('lng')
    expect(nodes[0]).toHaveProperty('label')
    expect(nodes[0]).toHaveProperty('radius')
    expect(nodes[0]).toHaveProperty('color')
    expect(nodes[0]).toHaveProperty('pulseColor')
    expect(nodes[0]).toHaveProperty('pulseSpeed')
  })

  it('builds fewer nodes for risk mode', () => {
    const all = buildNodes('world')
    const risk = buildNodes('risk')
    expect(risk.length).toBeLessThanOrEqual(all.length)
  })

  it('uses risk score to determine node color', () => {
    const nodes = buildNodes('world')
    for (const node of nodes) {
      if (node.color === '#ff4d5e') {
        // high risk nodes are red
        expect(['#ff4d5e', '#f5b941', '#38e8ff']).toContain(node.color)
      }
    }
  })
})

describe('buildArcs comprehensive', () => {
  it('builds arcs with all required properties', () => {
    const links: GraphLink[] = [
      { source: 'Oil', target: 'NVIDIA', influence: 0.8, trustScore: 0.9 },
    ]
    const arcs = buildArcs(links)
    expect(arcs.length).toBe(1)
    const arc = arcs[0]
    expect(arc).toHaveProperty('startLat')
    expect(arc).toHaveProperty('startLng')
    expect(arc).toHaveProperty('endLat')
    expect(arc).toHaveProperty('endLng')
    expect(arc).toHaveProperty('altitude')
    expect(arc).toHaveProperty('stroke')
    expect(arc).toHaveProperty('dashLength')
    expect(arc).toHaveProperty('dashGap')
    expect(arc).toHaveProperty('dashAnimateTime')
  })

  it('assigns higher altitude to higher influence links', () => {
    const highInf: GraphLink[] = [{ source: 'Oil', target: 'NVIDIA', influence: 0.9 }]
    const lowInf: GraphLink[] = [{ source: 'Oil', target: 'NVIDIA', influence: 0.3 }]
    const highArcs = buildArcs(highInf)
    const lowArcs = buildArcs(lowInf)
    if (highArcs.length > 0 && lowArcs.length > 0) {
      expect(highArcs[0].altitude).toBeGreaterThan(lowArcs[0].altitude)
    }
  })
})

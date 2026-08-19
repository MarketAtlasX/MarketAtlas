import { describe, it, expect } from 'vitest'
import { buildArcs } from '../features/globe/globeData'
import type { GraphLink } from '../types'

const link = (source: string, target: string, influence: number): GraphLink => ({ source, target, influence })

describe('buildArcs', () => {
  it('maps influence to arc altitude and stroke', () => {
    const strong = buildArcs([link('Oil', 'NVIDIA', 0.9)])
    const weak = buildArcs([link('Oil', 'NVIDIA', 0.5)])
    expect(strong[0].altitude).toBeGreaterThan(weak[0].altitude)
    expect(strong[0].stroke).toBeGreaterThan(weak[0].stroke)
  })

  it('colors arcs by influence band', () => {
    expect(buildArcs([link('Oil', 'NVIDIA', 0.9)])[0].color).toBe('#38e8ff')
    expect(buildArcs([link('Oil', 'NVIDIA', 0.6)])[0].color).toBe('#14b8d6')
    expect(buildArcs([link('Oil', 'NVIDIA', 0.4)])[0].color).toBe('#1e5f7a')
  })

  it('defaults influence to mid-strength when absent', () => {
    const arcs = buildArcs([{ source: 'Oil', target: 'NVIDIA' }])
    expect(arcs[0].stroke).toBeCloseTo(0.5 + 0.5 * 0.6)
  })

  it('keeps dashed attributes on every arc', () => {
    for (const a of buildArcs([link('Oil', 'NVIDIA', 0.8)])) {
      expect(a.dashLength).toBeGreaterThan(0)
      expect(a.dashGap).toBeGreaterThan(0)
      expect(a.dashAnimateTime).toBeGreaterThan(0)
    }
  })
})

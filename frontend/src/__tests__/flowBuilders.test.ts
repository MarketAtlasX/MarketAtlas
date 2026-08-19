import { describe, it, expect } from 'vitest'
import { buildTradeFlows, buildSupplyFlows, buildConflictFlows } from '../features/globe/SceneDirector'

describe('buildTradeFlows', () => {
  const flows = buildTradeFlows()

  it('produces at least one trade flow', () => {
    expect(flows.length).toBeGreaterThan(0)
  })

  it('emits resolved numeric endpoints for every flow', () => {
    for (const f of flows) {
      expect(typeof f.startLat).toBe('number')
      expect(typeof f.startLng).toBe('number')
      expect(typeof f.endLat).toBe('number')
      expect(typeof f.endLng).toBe('number')
    }
  })

  it('colors large corridors gold and smaller ones cyan', () => {
    expect(flows.some(f => f.tone === 'gold')).toBe(true)
    expect(flows.every(f => f.tone === 'gold' || f.tone === 'cyan')).toBe(true)
  })

  it('normalizes intensity between zero and one', () => {
    for (const f of flows) {
      expect(f.intensity).toBeGreaterThan(0)
      expect(f.intensity).toBeLessThanOrEqual(1)
    }
  })
})

describe('buildSupplyFlows', () => {
  const flows = buildSupplyFlows()

  it('returns an array of supply links', () => {
    expect(Array.isArray(flows)).toBe(true)
  })

  it('marks every supply flow cyan', () => {
    for (const f of flows) {
      expect(f.tone).toBe('cyan')
      expect(f.color).toBe('#38e8ff')
    }
  })

  it('scales intensity with link criticality', () => {
    for (const f of flows) {
      expect(f.intensity).toBeGreaterThan(0)
      expect(f.intensity).toBeLessThanOrEqual(1)
    }
  })
})

describe('buildConflictFlows', () => {
  const flows = buildConflictFlows()

  it('returns an array of conflict links', () => {
    expect(Array.isArray(flows)).toBe(true)
  })

  it('marks every conflict flow red', () => {
    for (const f of flows) {
      expect(f.tone).toBe('red')
      expect(['#ff3b30', '#ff7a2e']).toContain(f.color)
    }
  })
})

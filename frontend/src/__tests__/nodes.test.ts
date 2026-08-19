import { describe, it, expect } from 'vitest'
import { buildNodes } from '../features/globe/globeData'

describe('buildNodes', () => {
  const world = buildNodes('world')
  const risk = buildNodes('risk')

  it('emits nodes with full pulse metadata in world mode', () => {
    for (const n of world) {
      expect(n).toHaveProperty('pulseColor')
      expect(n).toHaveProperty('pulseSpeed')
      expect(n.pulseSpeed).toBeGreaterThan(1)
    }
  })

  it('keeps node radius within the normalized band', () => {
    for (const n of world) {
      expect(n.radius).toBeGreaterThanOrEqual(0.05)
      expect(n.radius).toBeLessThanOrEqual(0.12)
    }
  })

  it('narrows the set when filtering to risk mode', () => {
    expect(risk.length).toBeLessThanOrEqual(world.length)
    expect(risk.length).toBeGreaterThan(0)
  })

  it('colors nodes by risk band', () => {
    for (const n of world) {
      expect(['#ff4d5e', '#f5b941', '#38e8ff']).toContain(n.color)
    }
  })

  it('resolves a coordinate for every node', () => {
    for (const n of world) {
      expect(typeof n.lat).toBe('number')
      expect(typeof n.lng).toBe('number')
    }
  })
})

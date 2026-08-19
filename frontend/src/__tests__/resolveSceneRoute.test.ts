import { describe, it, expect } from 'vitest'
import { resolveScene } from '../features/globe/SceneDirector'
import { createIntent } from '../features/globe/visualizationIntent'

describe('resolveScene route networks', () => {
  it('traces a primary corridor plus an origin fan', () => {
    const s = resolveScene(createIntent({ mode: 'route', origin: 'India', destination: 'Germany', focus: ['India', 'Germany'] }))
    const main = s.routes.find(r => r.intensity === 1)
    expect(main).toBeDefined()
    expect(main?.tone).toBe('gold')
    expect(s.routes.length).toBe(7)
  })

  it('rings the origin and destination in the same scene', () => {
    const s = resolveScene(createIntent({ mode: 'route', origin: 'India', destination: 'Germany', focus: ['India', 'Germany'] }))
    expect(s.regions.some(r => r.label === 'India')).toBe(true)
    expect(s.regions.some(r => r.label === 'Germany')).toBe(true)
  })

  it('fans outward from a single origin with no destination', () => {
    const s = resolveScene(createIntent({ mode: 'route', origin: 'India' }))
    expect(s.routes).toHaveLength(6)
  })

  it('falls back to the hub web when the origin is unknown', () => {
    const s = resolveScene(createIntent({ mode: 'route', origin: 'Nope' }))
    expect(s.routes).toHaveLength(21)
    expect(s.regions).toHaveLength(0)
  })

  it('colors fan links by destination risk', () => {
    const s = resolveScene(createIntent({ mode: 'route', origin: 'India' }))
    for (const f of s.routes) {
      expect(['red', 'cyan']).toContain(f.tone)
    }
  })
})

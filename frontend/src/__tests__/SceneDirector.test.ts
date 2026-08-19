import { describe, it, expect } from 'vitest'
import { resolveScene } from '../features/globe/SceneDirector'
import { createIntent } from '../features/globe/visualizationIntent'

describe('resolveScene scene structure', () => {
  it('returns a plain globe scene for globe mode', () => {
    const s = resolveScene(createIntent({ mode: 'globe' }))
    expect(s.map).toBe(false)
    expect(s.showOverlays).toBe(true)
    expect(s.autoRotate).toBe(true)
    expect(s.routes).toHaveLength(0)
    expect(s.regions).toHaveLength(0)
    expect(s.conflicts).toHaveLength(0)
    expect(s.camera.kind).toBe('globe')
  })

  it('switches to map scene with hub regions for map mode', () => {
    const s = resolveScene(createIntent({ mode: 'map' }))
    expect(s.map).toBe(true)
    expect(s.camera.kind).toBe('map')
    expect(s.showOverlays).toBe(true)
    expect(s.routes.length).toBeGreaterThan(0)
    expect(s.regions.length).toBeGreaterThanOrEqual(7)
    expect(s.regions.every(r => r.kind === 'hub')).toBe(true)
  })

  it('layers supply flows on top of trade flows for supply mode', () => {
    const s = resolveScene(createIntent({ mode: 'supply' }))
    expect(s.map).toBe(true)
    expect(s.camera.kind).toBe('map')
    expect(s.routes.length).toBeGreaterThan(0)
  })

  it('builds a full hub web for network mode', () => {
    const s = resolveScene(createIntent({ mode: 'network' }))
    expect(s.routes).toHaveLength(21)
    expect(s.regions).toHaveLength(7)
    expect(s.showOverlays).toBe(true)
  })

  it('collects conflict rings for risk mode', () => {
    const s = resolveScene(createIntent({ mode: 'risk' }))
    expect(s.conflicts.length).toBeGreaterThan(0)
    expect(s.regions).toHaveLength(0)
    expect(s.showOverlays).toBe(true)
  })

  it('maps conflict mode flows and focused rings', () => {
    const s = resolveScene(createIntent({ mode: 'conflict' }))
    expect(s.routes.length).toBeGreaterThan(0)
    expect(s.showOverlays).toBe(true)
  })

  it('detaches the core for abstract reasoning', () => {
    const s = resolveScene(createIntent({ mode: 'abstract' }))
    expect(s.transition.detach).toBe(1)
    expect(s.camera.kind).toBe('orbit')
    expect(s.autoRotate).toBe(true)
  })

  it('keeps the core intact for core mode', () => {
    const s = resolveScene(createIntent({ mode: 'core' }))
    expect(s.transition.detach).toBe(0)
    expect(s.camera.kind).toBe('globe')
  })
})

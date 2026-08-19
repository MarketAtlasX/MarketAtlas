import { describe, it, expect } from 'vitest'
import { resolveScene, buildTradeFlows } from '../features/globe/SceneDirector'
import { createIntent } from '../features/globe/visualizationIntent'

describe('resolveScene map mode detail', () => {
  it('maps every trade flow onto the map plane', () => {
    const s = resolveScene(createIntent({ mode: 'map' }))
    expect(s.routes).toHaveLength(buildTradeFlows().length)
    expect(s.regions.every(r => r.kind === 'hub')).toBe(true)
  })

  it('overlays explicit focus regions on the map', () => {
    const s = resolveScene(createIntent({ mode: 'map', focus: ['Iran'] }))
    expect(s.regions.some(r => r.kind === 'focus' && r.label === 'Iran')).toBe(true)
  })

  it('keeps map flight on the elevated pullback camera', () => {
    const s = resolveScene(createIntent({ mode: 'map' }))
    expect(s.camera.kind).toBe('map')
    expect(s.camera.position[1]).toBeGreaterThan(0)
    expect(s.camera.lookAt[1]).toBeLessThan(0)
  })
})

describe('resolveScene supply mode detail', () => {
  it('layers supply flows over trade corridors', () => {
    const s = resolveScene(createIntent({ mode: 'supply' }))
    expect(s.routes.length).toBeGreaterThan(0)
  })

  it('sits slightly lower than the world map', () => {
    const supply = resolveScene(createIntent({ mode: 'supply' }))
    const map = resolveScene(createIntent({ mode: 'map' }))
    expect(supply.camera.position[1]).toBeLessThan(map.camera.position[1])
  })
})

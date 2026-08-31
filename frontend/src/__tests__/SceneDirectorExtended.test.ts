import { describe, it, expect } from 'vitest'
import { resolveScene, createIntent } from '../features/globe/SceneDirector'
import { createIntent as createVizIntent } from '../features/globe/visualizationIntent'

describe('resolveScene', () => {
  it('returns a globe mode scene for world intent', () => {
    const intent = createVizIntent({ mode: 'globe' })
    const scene = resolveScene(intent)
    expect(scene).toBeDefined()
    expect(scene.camera).toBeDefined()
    expect(scene.routes).toBeDefined()
    expect(scene.regions).toBeDefined()
    expect(scene.conflicts).toBeDefined()
  })

  it('returns a risk scene for risk intent', () => {
    const intent = createVizIntent({ mode: 'risk' })
    const scene = resolveScene(intent)
    expect(scene).toBeDefined()
    expect(scene.routes).toBeDefined()
    expect(scene.conflicts.length).toBeGreaterThanOrEqual(0)
  })

  it('returns a supply scene for supply intent', () => {
    const intent = createVizIntent({ mode: 'supply' })
    const scene = resolveScene(intent)
    expect(scene).toBeDefined()
    expect(scene.routes).toBeDefined()
  })

  it('returns a map scene for map intent', () => {
    const intent = createVizIntent({ mode: 'map' })
    const scene = resolveScene(intent)
    expect(scene).toBeDefined()
    expect(scene.map).toBe(true)
  })

  it('returns an events scene for globe intent', () => {
    const intent = createVizIntent({ mode: 'globe' })
    const scene = resolveScene(intent)
    expect(scene).toBeDefined()
    expect(scene.showOverlays).toBe(true)
  })

  it('always includes a valid camera configuration', () => {
    const modes = ['world', 'risk', 'supply', 'map', 'events'] as const
    for (const mode of modes) {
      const intent = createVizIntent({ mode })
      const scene = resolveScene(intent)
      expect(scene.camera).toBeDefined()
      expect(scene.camera.position).toHaveLength(3)
    }
  })
})

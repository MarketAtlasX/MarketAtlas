import { describe, it, expect } from 'vitest'
import { createIntent, type VisualizationIntent } from '../features/globe/visualizationIntent'
import { resolveScene } from '../features/globe/SceneDirector'

describe('Globe scene completeness', () => {
  const modes: Array<VisualizationIntent['mode']> = ['world', 'risk', 'supply', 'map', 'events']

  it('resolves a complete scene for every mode', () => {
    for (const mode of modes) {
      const intent = createIntent({ mode })
      const scene = resolveScene(intent)
      expect(scene).toBeDefined()
      expect(scene.camera).toBeDefined()
      expect(scene.camera.position).toHaveLength(3)
      expect(scene.routes).toBeDefined()
      expect(Array.isArray(scene.routes)).toBe(true)
      expect(scene.regions).toBeDefined()
      expect(Array.isArray(scene.regions)).toBe(true)
      expect(scene.conflicts).toBeDefined()
      expect(Array.isArray(scene.conflicts)).toBe(true)
    }
  })

  it('returns showOverlays true for interactive modes', () => {
    const interactiveModes = ['country', 'region', 'route', 'network', 'risk', 'conflict', 'globe', 'events'] as const
    for (const mode of interactiveModes) {
      const intent = createIntent({ mode })
      const scene = resolveScene(intent)
      expect(scene.showOverlays).toBe(true)
    }
  })

  it('sets map flag for map and supply modes', () => {
    const mapIntent = createIntent({ mode: 'map' })
    const supplyIntent = createIntent({ mode: 'supply' })
    expect(resolveScene(mapIntent).map).toBe(true)
    expect(resolveScene(supplyIntent).map).toBe(true)
  })
})

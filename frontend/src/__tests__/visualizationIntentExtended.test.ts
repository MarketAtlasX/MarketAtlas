import { describe, it, expect } from 'vitest'
import { DEFAULT_INTENT, createIntent, INTENT_CAPTION } from '../features/globe/visualizationIntent'

describe('DEFAULT_INTENT', () => {
  it('has a valid default mode', () => {
    expect(DEFAULT_INTENT.mode).toBe('globe')
  })

  it('has a global scale by default', () => {
    expect(DEFAULT_INTENT.scale).toBe('global')
  })

  it('has empty focus by default', () => {
    expect(DEFAULT_INTENT.focus).toEqual([])
  })

  it('has a caption', () => {
    expect(DEFAULT_INTENT.caption).toBeTruthy()
  })
})

describe('createIntent', () => {
  it('merges partial intent with defaults', () => {
    const intent = createIntent({ mode: 'risk', scale: 'regional' })
    expect(intent.mode).toBe('risk')
    expect(intent.scale).toBe('regional')
    expect(intent.transition).toBe('particle_reform')
  })

  it('always includes a caption', () => {
    const intent = createIntent({ mode: 'country', focus: ['Taiwan'] })
    expect(intent.caption).toBeTruthy()
  })

  it('overrides all provided fields', () => {
    const intent = createIntent({ mode: 'map', camera: 'pullback', palette: 'map' })
    expect(intent.mode).toBe('map')
    expect(intent.camera).toBe('pullback')
    expect(intent.palette).toBe('map')
  })
})

describe('INTENT_CAPTION', () => {
  it('has captions for all known modes', () => {
    const modes = ['core', 'globe', 'country', 'region', 'route', 'network', 'risk', 'conflict', 'abstract', 'map', 'supply']
    for (const mode of modes) {
      expect(INTENT_CAPTION[mode]).toBeTruthy()
    }
  })
})

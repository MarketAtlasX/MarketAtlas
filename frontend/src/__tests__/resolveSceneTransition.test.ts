import { describe, it, expect } from 'vitest'
import { resolveScene } from '../features/globe/SceneDirector'
import { createIntent } from '../features/globe/visualizationIntent'

describe('resolveScene transition state', () => {
  it('keeps the globe calm and ultron-tinted by default', () => {
    const s = resolveScene(createIntent({ mode: 'globe' }))
    expect(s.transition.detach).toBe(0)
    expect(s.transition.focusStrength).toBe(0)
    expect(s.transition.focusRadius).toBe(0.8)
    expect(s.transition.heatColor).toBe('#ffb020')
  })

  it('tightens focus around a single country', () => {
    const s = resolveScene(createIntent({ mode: 'country', focus: ['India'], origin: 'India' }))
    expect(s.transition.detach).toBe(0.16)
    expect(s.transition.focusStrength).toBeCloseTo(0.95)
    expect(s.transition.focusRadius).toBe(0.5)
  })

  it('pulses risk red across the heatfield', () => {
    const s = resolveScene(createIntent({ mode: 'risk' }))
    expect(s.transition.heatColor).toBe('#ff3b30')
    expect(s.transition.tint).toBe('#ff9a5a')
  })

  it('glows intelligence blue in core and abstract modes', () => {
    const core = resolveScene(createIntent({ mode: 'core' }))
    expect(core.transition.heatColor).toBe('#7adcff')
    const abstract = resolveScene(createIntent({ mode: 'abstract' }))
    expect(abstract.transition.heatColor).toBe('#7adcff')
    expect(abstract.transition.tint).toBe('#7fa8ff')
  })

  it('detaches the surface for map flight', () => {
    const s = resolveScene(createIntent({ mode: 'map' }))
    expect(s.transition.detach).toBe(0.5)
    expect(s.transition.focusStrength).toBe(0)
  })

  it('mixes a soft focus into route framing', () => {
    const s = resolveScene(createIntent({ mode: 'route', origin: 'India', destination: 'Germany', focus: ['India', 'Germany'] }))
    expect(s.transition.detach).toBe(0.3)
    expect(s.transition.focusRadius).toBe(1.1)
  })

  it('widens focus across regions', () => {
    const s = resolveScene(createIntent({ mode: 'region', focus: ['China', 'Japan'] }))
    expect(s.transition.detach).toBe(0.08)
    expect(s.transition.focusStrength).toBeCloseTo(0.6)
    expect(s.transition.focusRadius).toBe(0.85)
  })
})

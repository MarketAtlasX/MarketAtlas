import { describe, it, expect } from 'vitest'
import { resolveScene } from '../features/globe/SceneDirector'
import { createIntent } from '../features/globe/visualizationIntent'

describe('resolveScene camera placement', () => {
  it('pulls back for the default globe view', () => {
    const s = resolveScene(createIntent({ mode: 'globe' }))
    expect(s.camera.position).toEqual([0, 1.5, 6.5])
    expect(s.camera.lookAt).toEqual([0, 0, 0])
  })

  it('uses an elevated map camera that looks slightly down', () => {
    const s = resolveScene(createIntent({ mode: 'map' }))
    expect(s.camera.position).toEqual([0, 3.6, 7.6])
    expect(s.camera.lookAt).toEqual([0, -0.3, 0])
  })

  it('frames the supply network lower than the world map', () => {
    const s = resolveScene(createIntent({ mode: 'supply' }))
    expect(s.camera.position).toEqual([0, 3.2, 7.2])
    expect(s.camera.lookAt).toEqual([0, -0.2, 0])
  })

  it('zooms toward a focused country', () => {
    const s = resolveScene(createIntent({ mode: 'country', focus: ['India'], origin: 'India' }))
    const dir = s.transition.focus
    expect(dir).not.toBeNull()
    expect(s.camera.position[0]).toBeCloseTo((dir?.x ?? 0) * 3.05)
    expect(s.camera.position[1]).toBeCloseTo((dir?.y ?? 0) * 3.05 + 0.45)
  })

  it('frames the midpoint of a route', () => {
    const s = resolveScene(createIntent({ mode: 'route', origin: 'India', destination: 'Germany', focus: ['India', 'Germany'] }))
    expect(s.camera.position).toEqual([0, 1.7, 7.6])
    expect(s.transition.focusStrength).toBeCloseTo(0.35)
  })

  it('frames a focused risk area', () => {
    const s = resolveScene(createIntent({ mode: 'risk', focus: ['Iran'], origin: 'Iran' }))
    const dir = s.transition.focus
    expect(dir).not.toBeNull()
    expect(s.transition.focusStrength).toBeCloseTo(0.5)
  })

  it('orbits for abstract mode and pulls back for core mode', () => {
    expect(resolveScene(createIntent({ mode: 'abstract' })).camera.position).toEqual([0, 0.6, 6])
    expect(resolveScene(createIntent({ mode: 'core' })).camera.position).toEqual([0, 1.2, 5.2])
  })
})

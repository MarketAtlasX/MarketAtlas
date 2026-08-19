import { describe, it, expect } from 'vitest'
import { latLngToDir } from '../features/globe/SceneDirector'

describe('latLngToDir', () => {
  it('maps the prime meridian equator to the +X axis', () => {
    const v = latLngToDir(0, 0)
    expect(v.x).toBeCloseTo(1)
    expect(v.y).toBeCloseTo(0)
    expect(v.z).toBeCloseTo(0)
  })

  it('maps the north pole to +Y', () => {
    const v = latLngToDir(90, 0)
    expect(v.x).toBeCloseTo(0)
    expect(v.y).toBeCloseTo(1)
    expect(v.z).toBeCloseTo(0)
  })

  it('maps the south pole to -Y', () => {
    const v = latLngToDir(-90, 0)
    expect(v.x).toBeCloseTo(0)
    expect(v.y).toBeCloseTo(-1)
    expect(v.z).toBeCloseTo(0)
  })

  it('always returns a unit vector', () => {
    for (const [lat, lng] of [[10, 20], [-45, 120], [80, -170], [0, 180]]) {
      const v = latLngToDir(lat, lng)
      const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
      expect(len).toBeCloseTo(1)
    }
  })

  it('maps the dateline equator to the -X axis', () => {
    const v = latLngToDir(0, 180)
    expect(v.x).toBeCloseTo(-1)
    expect(v.z).toBeCloseTo(0)
  })
})

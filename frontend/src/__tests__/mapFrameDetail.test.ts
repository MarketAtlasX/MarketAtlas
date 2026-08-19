import { describe, it, expect } from 'vitest'
import { buildMapFrame } from '../features/globe/globeData'

describe('buildMapFrame', () => {
  const frame = buildMapFrame(10, 6.5)

  it('walks the four corners in order', () => {
    expect(frame[0]).toMatchObject({ x: -5, y: 0.02, z: -3.25 })
    expect(frame[1]).toMatchObject({ x: 5, y: 0.02, z: -3.25 })
    expect(frame[2]).toMatchObject({ x: 5, y: 0.02, z: 3.25 })
    expect(frame[3]).toMatchObject({ x: -5, y: 0.02, z: 3.25 })
  })

  it('closes the loop back to the start', () => {
    expect(frame[4]).toEqual(frame[0])
  })

  it('lies flat on the map plane', () => {
    for (const p of frame) {
      expect(p.y).toBe(0.02)
    }
  })
})

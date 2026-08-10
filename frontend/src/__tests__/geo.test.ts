import { describe, it, expect } from 'vitest'
import { haversineDistance, getZoomLevel } from '../utils/geo'

describe('haversineDistance', () => {
  it('returns 0 for same point', () => {
    expect(haversineDistance(0, 0, 0, 0)).toBe(0)
  })

  it('calculates NYC to London approximately', () => {
    const dist = haversineDistance(40.7128, -74.0060, 51.5074, -0.1278)
    expect(dist).toBeGreaterThan(5500)
    expect(dist).toBeLessThan(5600)
  })
})

describe('getZoomLevel', () => {
  it('returns 9 for small countries', () => {
    expect(getZoomLevel('HK')).toBe(9)
  })

  it('returns 4 for large countries', () => {
    expect(getZoomLevel('US')).toBe(4)
  })

  it('returns 5 for default', () => {
    expect(getZoomLevel('FR')).toBe(5)
  })
})

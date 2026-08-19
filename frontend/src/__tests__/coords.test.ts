import { describe, it, expect } from 'vitest'
import { resolveCoords, riskFor, ENTITY_COORDS } from '../features/globe/globeData'

describe('ENTITY_COORDS', () => {
  it('provides coordinates for critical sectors', () => {
    expect(ENTITY_COORDS.Oil).toEqual({ lat: 27.0, lng: 52.0 })
    expect(ENTITY_COORDS.TSMC).toEqual({ lat: 23.7, lng: 120.96 })
    expect(ENTITY_COORDS.NVIDIA).toEqual({ lat: 37.4, lng: -122.0 })
  })
})

describe('resolveCoords', () => {
  it('resolves country names from the country dataset', () => {
    const c = resolveCoords('Germany')
    expect(c).not.toBeNull()
    expect(typeof c?.lat).toBe('number')
    expect(typeof c?.lng).toBe('number')
  })

  it('resolves world states that fall back to synthetic coordinates', () => {
    const c = resolveCoords('Argentina')
    expect(c).not.toBeNull()
  })

  it('returns null for completely unknown names', () => {
    expect(resolveCoords('Atlantis')).toBeNull()
  })
})

describe('riskFor', () => {
  it('returns 50 for unknown states', () => {
    expect(riskFor('Atlantis')).toBe(50)
  })

  it('binds known risks into a sane band', () => {
    expect(riskFor('Germany')).toBeGreaterThanOrEqual(0)
    expect(riskFor('Germany')).toBeLessThanOrEqual(100)
  })
})

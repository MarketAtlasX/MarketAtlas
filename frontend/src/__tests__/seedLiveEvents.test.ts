import { describe, it, expect } from 'vitest'
import { seedLiveEvents } from '../features/globe/globeData'

describe('seedLiveEvents', () => {
  const events = seedLiveEvents()

  it('returns an array of live events', () => {
    expect(Array.isArray(events)).toBe(true)
  })

  it('maps every seeded event into the live event shape', () => {
    for (const e of events) {
      expect(e).toHaveProperty('id')
      expect(e).toHaveProperty('title')
      expect(e).toHaveProperty('country')
      expect(e).toHaveProperty('severity')
      expect(e).toHaveProperty('timestamp')
      expect(e).toHaveProperty('summary')
      expect(e).toHaveProperty('sectors')
    }
  })

  it('resolves country codes to names', () => {
    for (const e of events) {
      expect(e.country.length).toBeGreaterThan(0)
      expect(e.country.length).toBeGreaterThan(2)
    }
  })
})

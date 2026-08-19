import { describe, it, expect } from 'vitest'
import { buildEventNodes } from '../features/globe/globeData'
import type { LiveEvent } from '../types'

const makeEvent = (overrides: Partial<LiveEvent>): LiveEvent => ({
  id: 'e1',
  title: 'Escalation',
  countryCode: 'IR',
  country: 'Iran',
  type: 'conflict',
  severity: 8,
  lat: 33,
  lng: 51,
  timestamp: '2026-01-01T00:00:00Z',
  summary: 's',
  sectors: ['Oil'],
  ...overrides,
})

describe('buildEventNodes', () => {
  it('scales node radius and pulse speed with severity', () => {
    const low = buildEventNodes([makeEvent({ severity: 3 })])[0]
    const high = buildEventNodes([makeEvent({ severity: 9 })])[0]
    expect(high.radius).toBeGreaterThan(low.radius)
    expect(high.pulseSpeed).toBeGreaterThan(low.pulseSpeed)
  })

  it('colors critical events red and moderate events amber', () => {
    expect(buildEventNodes([makeEvent({ severity: 8 })])[0].color).toBe('#ff4d5e')
    expect(buildEventNodes([makeEvent({ severity: 6 })])[0].color).toBe('#f5b941')
    expect(buildEventNodes([makeEvent({ severity: 4 })])[0].color).toBe('#38e8ff')
  })

  it('falls back to a default latitude when missing', () => {
    const n = buildEventNodes([makeEvent({ lat: 0, lng: 0 })])[0]
    expect(n.lat).toBe(20)
  })

  it('derives longitude from the event index when missing', () => {
    const n = buildEventNodes([makeEvent({ lat: 0, lng: 0 })])[0]
    expect(n.lng).toBe(-180)
  })

  it('labels and tags nodes with the event country', () => {
    const n = buildEventNodes([makeEvent({ country: 'Iran' })])[0]
    expect(n.label).toBe('Iran')
    expect(n.entity).toBe('Iran')
  })
})

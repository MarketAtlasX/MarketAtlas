import { describe, it, expect } from 'vitest'
import { inferVisualization } from '../assistant/brain/inferVisualization'

describe('inferVisualization aliases', () => {
  it('resolves usa to the United States', () => {
    const v = inferVisualization('Route from usa to china')
    expect(v.mode).toBe('route')
    expect(v.origin).toBe('United States')
    expect(v.destination).toBe('China')
  })

  it('resolves saudi and russia as origin and destination', () => {
    const v = inferVisualization('Trade between saudi arabia and russia')
    expect(v.mode).toBe('route')
    expect(v.origin).toBe('Saudi Arabia')
    expect(v.destination).toBe('Russia')
  })

  it('keeps unnamed map requests as a world map', () => {
    const v = inferVisualization('Show me a map of the horn of africa')
    expect(v.mode).toBe('map')
  })

  it('deduplicates repeated aliases', () => {
    const v = inferVisualization('Show india and India and japan')
    expect(v.focus.filter(f => f === 'India')).toHaveLength(1)
  })
})

import { describe, it, expect } from 'vitest'
import { inferVisualization } from '../assistant/brain/inferVisualization'

describe('inferVisualization', () => {
  it('maps a route query with two countries to route mode', () => {
    const v = inferVisualization('Show me the route from India to Germany')
    expect(v.mode).toBe('route')
    expect(v.origin).toBe('India')
    expect(v.destination).toBe('Germany')
    expect(v.camera).toBe('pullback')
  })

  it('maps a single country to country mode with zoom', () => {
    const v = inferVisualization('Show India')
    expect(v.mode).toBe('country')
    expect(v.focus).toContain('India')
    expect(v.camera).toBe('zoom_in')
  })

  it('maps a conflict query to conflict mode with risk palette', () => {
    const v = inferVisualization('Show me conflict zones')
    expect(v.mode).toBe('conflict')
    expect(v.palette).toBe('risk')
  })

  it('maps an abstract general question to abstract mode', () => {
    const v = inferVisualization('Explain general relativity')
    expect(v.mode).toBe('abstract')
    expect(v.transition).toBe('disintegrate')
    expect(v.camera).toBe('orbit')
  })

  it('maps a general query about markets to abstract mode', () => {
    const v = inferVisualization('What is the difference between an LSTM and a Transformer?')
    expect(v.mode).toBe('abstract')
  })

  it('defaults to globe mode for unknown queries', () => {
    const v = inferVisualization('Analyze this dataset')
    expect(v.mode).toBe('globe')
  })

  it('maps trade routes between regions to route mode', () => {
    const v = inferVisualization('Show me the major trade routes between Asia and Europe')
    expect(v.mode).toBe('route')
    expect(v.focus.length).toBeGreaterThanOrEqual(2)
  })
})
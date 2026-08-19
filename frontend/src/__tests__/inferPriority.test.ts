import { describe, it, expect } from 'vitest'
import { inferVisualization } from '../assistant/brain/inferVisualization'

describe('inferVisualization mode priority', () => {
  it('favors abstract reasoning when no entities appear', () => {
    expect(inferVisualization('What is risk in financial markets?').mode).toBe('abstract')
    expect(inferVisualization('How does war affect oil prices?').mode).toBe('abstract')
  })

  it('favors conflict over abstract when entities are named', () => {
    expect(inferVisualization('Explain the conflict in the middle east').mode).toBe('conflict')
  })

  it('maps volatility phrasing to the risk heatfield', () => {
    expect(inferVisualization('Show high volatility in markets').mode).toBe('risk')
  })

  it('maps bare route phrasing without entities to the route web', () => {
    const v = inferVisualization('Trade routes and risk')
    expect(v.mode).toBe('route')
  })

  it('keeps country focus when a single entity resolves', () => {
    expect(inferVisualization('Explain the uk economy').mode).toBe('country')
  })
})

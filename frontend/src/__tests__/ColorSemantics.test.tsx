import { describe, it, expect } from 'vitest'
import { riskColor } from '../stores/WorldStore'

describe('Risk color semantics', () => {
  it('returns positive color for low risk', () => {
    expect(riskColor(20)).toBe('var(--positive)')
  })

  it('returns warning color for elevated risk', () => {
    expect(riskColor(60)).toBe('var(--warning)')
  })

  it('returns critical color for high risk', () => {
    expect(riskColor(80)).toBe('var(--critical)')
  })
})

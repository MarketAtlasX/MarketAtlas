import { describe, it, expect } from 'vitest'
import { generalAnswer } from '../assistant/brain/generalKnowledge'

describe('generalAnswer', () => {
  it('answers math expressions with confidence', () => {
    const a = generalAnswer('What is 15 * 4 + 2?')
    expect(a.text).toContain('= 62')
    expect(a.confidence).toBeGreaterThanOrEqual(0.9)
  })

  it('answers a curated general topic', () => {
    const a = generalAnswer('Explain the Fourier transform')
    expect(a.text).toContain('frequency')
    expect(a.confidence).toBeGreaterThanOrEqual(0.8)
  })

  it('answers relativity', () => {
    const a = generalAnswer('What is general relativity?')
    expect(a.text).toContain('spacetime')
  })

  it('handles greetings', () => {
    const a = generalAnswer('Hello')
    expect(a.text).toContain('JARVIS')
    expect(a.confidence).toBeGreaterThanOrEqual(0.8)
  })

  it('does not crash on empty input', () => {
    const a = generalAnswer('   ')
    expect(a.text.length).toBeGreaterThan(0)
  })
})
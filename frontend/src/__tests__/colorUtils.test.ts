import { describe, it, expect } from 'vitest'
import { getRiskColor, getSentimentTone, getConfidenceBadgeClass } from '../utils/colorUtils'

describe('colorUtils', () => {
  it('assigns correct risk colors', () => {
    expect(getRiskColor(0.85)).toBe('var(--critical)')
    expect(getRiskColor(0.6)).toBe('var(--amber)')
    expect(getRiskColor(0.3)).toBe('var(--accent)')
    expect(getRiskColor(0.1)).toBe('var(--text-mid)')
  })

  it('maps sentiment strings to tones', () => {
    expect(getSentimentTone('bullish')).toBe('green')
    expect(getSentimentTone('Strong Positive')).toBe('green')
    expect(getSentimentTone('bearish outlook')).toBe('red')
    expect(getSentimentTone('warning state')).toBe('amber')
    expect(getSentimentTone('sideways')).toBe('neutral')
  })

  it('returns badge class by confidence level', () => {
    expect(getConfidenceBadgeClass(0.9)).toContain('accent')
    expect(getConfidenceBadgeClass(0.6)).toContain('amber')
    expect(getConfidenceBadgeClass(0.3)).toContain('critical')
  })
})

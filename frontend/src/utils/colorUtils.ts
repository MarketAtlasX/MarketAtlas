/**
 * Semantic color utilities for financial and risk telemetry.
 */

export type SemanticTone = 'cyan' | 'green' | 'red' | 'amber' | 'neutral'

export function getRiskColor(riskLevel: number): string {
  if (riskLevel >= 0.75) return 'var(--critical)'
  if (riskLevel >= 0.5) return 'var(--amber)'
  if (riskLevel >= 0.25) return 'var(--accent)'
  return 'var(--text-mid)'
}

export function getSentimentTone(sentiment: 'bullish' | 'bearish' | 'neutral' | string): SemanticTone {
  const lower = sentiment.toLowerCase()
  if (lower.includes('bull') || lower.includes('positive')) return 'green'
  if (lower.includes('bear') || lower.includes('negative')) return 'red'
  if (lower.includes('warn') || lower.includes('caution')) return 'amber'
  return 'neutral'
}

export function getConfidenceBadgeClass(confidence: number): string {
  if (confidence >= 0.8) return 'border-[rgba(56,232,255,0.4)] text-[var(--accent)] bg-[rgba(56,232,255,0.08)]'
  if (confidence >= 0.5) return 'border-[rgba(255,213,74,0.4)] text-[var(--amber)] bg-[rgba(255,213,74,0.08)]'
  return 'border-[rgba(255,77,94,0.4)] text-[var(--critical)] bg-[rgba(255,77,94,0.08)]'
}

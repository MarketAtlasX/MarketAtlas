/**
 * Pure presentation helpers for the canonical `MarketObservation` records that
 * travel inside `EvidenceObservation.market_observations`.
 *
 * These never invent a value or a target: a market observation becomes
 * navigable only when the provider actually supplied a symbol, and a missing
 * price/change renders as an explicit unavailable string rather than a
 * fabricated number.
 */
import type { MarketObservation } from '../../api/evidenceApi'

export const UNAVAILABLE = 'UNAVAILABLE'

/**
 * Canonical globe entity for a market observation: its provider-supplied
 * symbol, or `null` when none was returned. Clicking the asset routes this
 * value through the existing globe selection path.
 */
export function marketObservationEntity(item: MarketObservation | null | undefined): string | null {
  if (!item) return null
  const symbol = typeof item.symbol === 'string' ? item.symbol.trim() : ''
  return symbol || null
}

/** Format a provider price, or `null` when the value is absent/not a number. */
export function formatMarketValue(value: unknown, digits = 2): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/** Format a percent change with an explicit sign, or `null` when absent. */
export function formatMarketChangePercent(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

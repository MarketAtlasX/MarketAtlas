import type { WatchlistAtlasContext } from '../../types'
import { formatChangePercent, formatPrice, relativeTime } from '../../features/profile/watchlistUtils'

export interface WatchlistBriefing {
  /** Deterministic, provider-grounded text safe to speak or display. */
  text: string
  /** Facts copied verbatim from the backend context — never inferred. */
  facts: string[]
  /** Explicit unknown/absent-data statements. */
  uncertainty: string[]
  tracked: number
  /** True only when at least one asset has a provider-backed quote. */
  hasLiveData: boolean
}

/**
 * Build a grounded watchlist briefing from the backend context.
 *
 * Every figure is copied from the authorized context; if a quote is missing the
 * briefing says so rather than estimating. It never claims an event caused a
 * price move.
 */
export function buildWatchlistBriefing(context: WatchlistAtlasContext | null): WatchlistBriefing {
  if (!context || context.total_tracked === 0) {
    return {
      text: 'Your watchlist is empty, so there is nothing to report.',
      facts: [],
      uncertainty: ['No watched assets are available to describe.'],
      tracked: 0,
      hasLiveData: false,
    }
  }

  const facts: string[] = []
  const uncertainty: string[] = []
  const liveAssets = context.assets.filter(asset => asset.market.status === 'provider-backed' && asset.market.price != null)

  facts.push(`${context.total_tracked} asset${context.total_tracked === 1 ? '' : 's'} tracked.`)

  const movers = context.movers.filter(mover => mover.market.change_percent != null).slice(0, 3)
  for (const mover of movers) {
    facts.push(
      `${mover.ticker} ${mover.market.change_percent! >= 0 ? 'up' : 'down'} ${formatChangePercent(
        Math.abs(mover.market.change_percent!),
      )} at ${formatPrice(mover.market.price, mover.market.currency)} (${mover.market.provider ?? 'provider'}, ${relativeTime(
        mover.market.observed_at,
      )}).`,
    )
  }

  const recordedLinked = context.assets.filter(asset => asset.association_reliability === 'recorded')
  if (recordedLinked.length > 0) {
    facts.push(
      `Recorded geopolitical event links exist for: ${recordedLinked.map(asset => asset.ticker).join(', ')}.`,
    )
  }

  if (context.unavailable_tickers.length > 0) {
    uncertainty.push(`No provider quote for: ${context.unavailable_tickers.join(', ')}.`)
  }
  uncertainty.push(...context.uncertainty)
  uncertainty.push(...context.limitations)

  const lead = liveAssets.length === 0
    ? 'No provider-backed prices are available right now.'
    : movers.length > 0
      ? `Today's largest moves: ${movers.map(mover => mover.ticker).join(', ')}.`
      : 'No watched asset shows a reported price change right now.'

  const text = [lead, ...facts, 'These are recorded movements; no causal claim is made.'].join(' ')

  return {
    text,
    facts,
    uncertainty: Array.from(new Set(uncertainty)),
    tracked: context.total_tracked,
    hasLiveData: liveAssets.length > 0,
  }
}

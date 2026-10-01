/**
 * Evidence API — typed client for the canonical backend evidence contract.
 *
 * The backend serves `GET /api/v1/live-events/observation` (proxied as
 * `/api/live-events/observation`) and returns the `EvidenceObservation`
 * envelope defined in `backend/app/schemas/observation.py`.
 *
 * This module is the single frontend mirror of that contract. It deliberately
 * performs no fallback, synthesis, or defaulting of missing values: an
 * unavailable observation must stay explicit rather than become fabricated
 * evidence.
 */

export type ObservationStatus = 'live' | 'stale' | 'degraded' | 'unavailable' | 'demo'

export interface ObservationSource {
  reference?: string | null
  url?: string | null
  title?: string | null
  provider?: string | null
  published_at?: string | null
  fetched_at?: string | null
  relevance?: number | null
}

export interface ObservationProvenance {
  provider?: string | null
  observed_at?: string | null
  confidence?: number | null
  references?: string[]
}

export interface MarketObservation {
  symbol: string
  asset_type?: 'equity' | 'index' | 'commodity' | 'currency' | 'unknown'
  price?: number | null
  change?: number | null
  change_percent?: number | null
  timestamp?: string | null
  provider?: string | null
  freshness?: string
  status: 'provider-backed' | 'cached' | 'unavailable' | 'simulated'
  currency?: string | null
}

export interface AffectedAsset {
  id?: string
  asset_type?: string
  ticker?: string | null
  name?: string | null
  estimated_move?: number | string | null
  volatility_impact?: number | string | null
  time_horizon?: string | null
  current_price?: number | null
  price_direction?: string | null
}

export interface ObservationImpact {
  id?: string
  entity_id?: number | string | null
  entity_name?: string
  entity_type?: string
  impact_direction?: string
  impact_score?: number | null
  confidence?: number | null
  impact_type?: string
  analysis_summary?: string | null
  reasoning_factors?: string[] | null
  generated_by?: string | null
  affected_assets?: AffectedAsset[]
}

export interface CausalLink {
  source?: string | null
  source_type?: string | null
  target?: string | null
  target_type?: string | null
  confidence?: number | null
  evidence_ref?: string | null
}

export interface EvidenceObservation {
  status: ObservationStatus
  query?: string | null
  freshness?: string
  event?: Record<string, unknown> | null
  entities?: string[]
  countries?: string[]
  assets?: string[]
  impacts?: ObservationImpact[]
  sources?: ObservationSource[]
  market_observations?: MarketObservation[]
  causal_chain?: CausalLink[]
  provenance?: ObservationProvenance
  confidence?: number | null
  uncertainty?: string[]
  provider_status?: Record<string, ObservationStatus>
  limitations?: string[]
}

export interface EvidenceQueryParams {
  /** Free-text query — usually the selected globe entity. */
  query?: string
  /** Optional asset ticker. */
  ticker?: string
  /** Optional ISO-2 country code. */
  countryCode?: string
  signal?: AbortSignal
}

/**
 * Causal edge node types that name a real, globe-selectable entity.
 *
 * The backend builds causal edges as event→geography→entity→asset
 * (see `backend/app/routes/live_events.py`). `event` is a narrative record,
 * not a globe entity, so it is intentionally excluded rather than mapped to
 * an invented node.
 */
const CAUSAL_NAVIGABLE_TYPES = new Set(['geography', 'entity', 'asset'])

/**
 * Resolve the selectable globe entity for one side of a causal link, or `null`
 * when the edge carries no reliable entity reference. Never guesses: a missing
 * or unrecognized node type is treated as non-navigable.
 */
export function causalNodeEntity(link: CausalLink, side: 'source' | 'target'): string | null {
  const value = side === 'source' ? link.source : link.target
  const type = side === 'source' ? link.source_type : link.target_type
  if (typeof value !== 'string' || !value.trim()) return null
  if (typeof type !== 'string' || !type.trim()) return null
  if (!CAUSAL_NAVIGABLE_TYPES.has(type.trim().toLowerCase())) return null
  return value.trim()
}

/**
 * Resolve the canonical selection for an affected asset: its ticker when
 * present, otherwise its recorded name. Returns `null` when neither exists.
 */
export function affectedAssetEntity(asset: AffectedAsset | null | undefined): string | null {
  if (!asset) return null
  const ticker = typeof asset.ticker === 'string' ? asset.ticker.trim() : ''
  if (ticker) return ticker
  const name = typeof asset.name === 'string' ? asset.name.trim() : ''
  return name || null
}

export function buildEvidenceSearchParams(params: Pick<EvidenceQueryParams, 'query' | 'ticker' | 'countryCode'>): string {
  const search = new URLSearchParams()
  const query = params.query?.trim()
  const ticker = params.ticker?.trim()
  const countryCode = params.countryCode?.trim()
  if (query) search.set('query', query)
  if (ticker) search.set('ticker', ticker.toUpperCase())
  if (countryCode) search.set('countryCode', countryCode)
  return search.toString()
}

/**
 * Fetch the canonical evidence observation for a selection.
 *
 * Resolves with the backend envelope (including `unavailable`) on a 2xx
 * response and rejects on transport or server errors so callers can render an
 * explicit error state instead of mistaking a failure for empty evidence.
 */
export async function fetchEvidenceObservation(params: EvidenceQueryParams): Promise<EvidenceObservation> {
  const search = buildEvidenceSearchParams(params)
  const response = await fetch(`/api/live-events/observation?${search}`, { signal: params.signal })
  if (!response.ok) {
    throw new Error(`Evidence service returned ${response.status}`)
  }
  return (await response.json()) as EvidenceObservation
}

/**
 * Derive a compact summary of an observation for Atlas state and globe overlays.
 * Every value is copied from the envelope — nothing is invented when missing.
 */
export function summarizeEvidence(observation: EvidenceObservation): {
  status: ObservationStatus
  freshness: string
  source: string | null
  observedAt: string | null
  confidence: number | null
  limitations: string[]
} {
  return {
    status: observation.status,
    freshness: observation.freshness ?? 'unknown',
    source: observation.provenance?.provider ?? null,
    observedAt: observation.provenance?.observed_at ?? null,
    confidence: observation.provenance?.confidence ?? observation.confidence ?? null,
    limitations: observation.limitations ?? [],
  }
}

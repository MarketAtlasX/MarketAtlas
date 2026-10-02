/**
 * Causal chain view — a pure, read-only derivation of the canonical
 * `EvidenceObservation.causal_chain` records.
 *
 * It never invents a link, a confidence, a timestamp, a source, or a market
 * relationship. Each hop reflects only the fields the backend actually
 * recorded; anything the envelope does not carry is surfaced as an explicit
 * limitation instead of being strengthened or assumed.
 *
 * The view also binds a chain's terminal asset to the market observation that
 * already exists in the same envelope, so the UI can render the recorded path
 * EVENT → IMPACT → AFFECTED ENTITY/ASSET → MARKET OBSERVATION without adding
 * a graph engine or a second evidence model.
 */
import type { CausalLink, EvidenceObservation, MarketObservation } from '../../api/evidenceApi'
import { causalNodeEntity } from '../../api/evidenceApi'

export interface CausalNodeView {
  /** Recorded label, or `null` when the backend omitted it. */
  label: string | null
  /** Recorded node type, lower-cased, or `null` when omitted. */
  type: string | null
  /** Navigable globe entity, or `null` when not a reliable typed reference. */
  entity: string | null
}

export interface CausalHopView {
  source: CausalNodeView
  target: CausalNodeView
  /** Display label of the recorded type pair (e.g. `GEOGRAPHY → ASSET`). */
  relationship: string
  /** Recorded confidence, or `null` when not recorded. */
  confidence: number | null
  /** Recorded evidence reference from the envelope, or `null`. */
  evidenceRef: string | null
  /** The market observation bound to the target asset, when one exists. */
  market: MarketObservation | null
  /** Concrete reasons this hop is not fully evidenced. */
  limitations: string[]
  /** True when both endpoints are reliable typed, globe-selectable entities. */
  navigable: boolean
}

export interface CausalChainView {
  hops: CausalHopView[]
  /** Chain-wide caveats (e.g. no links recorded at all). */
  limitations: string[]
  empty: boolean
}

export interface CausalChainSummary {
  total: number
  limited: number
  marketsLinked: number
}

/** Node types the canonical backend emits; anything else is unrecognized. */
const RECOGNIZED_TYPES = new Set(['geography', 'entity', 'asset', 'event'])

function nonEmpty(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function typeLabel(type: string | null): string {
  return type ? type.toUpperCase() : 'TYPE NOT RECORDED'
}

export function causalNodeView(link: CausalLink, side: 'source' | 'target'): CausalNodeView {
  const rawLabel = side === 'source' ? link.source : link.target
  const rawType = side === 'source' ? link.source_type : link.target_type
  const type = nonEmpty(rawType)
  return {
    label: nonEmpty(rawLabel),
    type: type ? type.toLowerCase() : null,
    entity: causalNodeEntity(link, side),
  }
}

export function causalRelationship(source: CausalNodeView, target: CausalNodeView): string {
  return `${typeLabel(source.type)} → ${typeLabel(target.type)}`
}

/**
 * Bind an asset node to the market observation already recorded in the same
 * envelope. Matching is exact on the provider-supplied symbol — no fuzzy or
 * inferred linkage.
 */
export function marketObservationForAsset(
  asset: CausalNodeView,
  markets: MarketObservation[],
): MarketObservation | null {
  const keys = [asset.entity, asset.label]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map(value => value.trim().toUpperCase())
  if (keys.length === 0) return null
  for (const market of markets) {
    const symbol = nonEmpty(market.symbol)?.toUpperCase()
    if (symbol && keys.includes(symbol)) return market
  }
  return null
}

export function buildCausalChain(observation: EvidenceObservation): CausalChainView {
  const markets = observation.market_observations ?? []
  const hops: CausalHopView[] = []

  for (const link of observation.causal_chain ?? []) {
    const source = causalNodeView(link, 'source')
    const target = causalNodeView(link, 'target')
    const limitations: string[] = []

    if (!source.label) limitations.push('SOURCE NOT RECORDED')
    if (!target.label) limitations.push('TARGET NOT RECORDED')
    if (!source.type) limitations.push('SOURCE TYPE NOT RECORDED')
    else if (!RECOGNIZED_TYPES.has(source.type)) limitations.push(`UNRECOGNIZED SOURCE TYPE: ${source.type.toUpperCase()}`)
    if (!target.type) limitations.push('TARGET TYPE NOT RECORDED')
    else if (!RECOGNIZED_TYPES.has(target.type)) limitations.push(`UNRECOGNIZED TARGET TYPE: ${target.type.toUpperCase()}`)

    const confidence = typeof link.confidence === 'number' ? link.confidence : null
    if (confidence === null) limitations.push('CONFIDENCE NOT RECORDED')

    const evidenceRef = nonEmpty(link.evidence_ref)
    if (!evidenceRef) limitations.push('EVIDENCE REFERENCE NOT RECORDED')

    const market = target.type === 'asset' ? marketObservationForAsset(target, markets) : null
    if (target.type === 'asset' && !market) limitations.push('NO MARKET OBSERVATION RECORDED FOR THIS ASSET')

    hops.push({
      source,
      target,
      relationship: causalRelationship(source, target),
      confidence,
      evidenceRef,
      market,
      limitations,
      navigable: Boolean(source.entity && target.entity),
    })
  }

  return {
    hops,
    limitations: hops.length === 0 ? ['No causal link was recorded in this observation.'] : [],
    empty: hops.length === 0,
  }
}

export function summarizeCausalChain(view: CausalChainView): CausalChainSummary {
  return {
    total: view.hops.length,
    limited: view.hops.filter(hop => hop.limitations.length > 0).length,
    marketsLinked: view.hops.filter(hop => hop.market !== null).length,
  }
}

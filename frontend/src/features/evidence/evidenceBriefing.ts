/**
 * Evidence briefing — a deterministic, read-only rendering of the canonical
 * `EvidenceObservation` used by ATLAS context snapshots and by grounded
 * fallback answers.
 *
 * This creates no second evidence model: every value is copied from the exact
 * envelope already displayed by the Evidence panel (`api/evidenceApi.ts`), and
 * every section the envelope does not contain is stated explicitly as "the
 * evidence does not establish…" instead of being filled with invented content.
 */
import type {
  AffectedAsset,
  CausalLink,
  EvidenceObservation,
  MarketObservation,
  ObservationImpact,
  ObservationSource,
} from '../../api/evidenceApi'
import type { AtlasEvidenceState } from '../../stores/AtlasStore'

const MISSING = 'NOT PROVIDED'

export interface EvidenceBriefing {
  /** Selection the briefing describes — never a previous entity's. */
  selection: string | null
  /** Envelope status copied from the observation. */
  status: string
  /** Freshness copied from the observation. */
  freshness: string
  /** Deterministic sectioned rendering of the canonical observation. */
  text: string
  /** Section keys the observation does not contain. */
  notEstablished: string[]
}

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** Confidence is rendered exactly like the panel does — never invented. */
function percent(value: unknown): string {
  const parsed = number(value)
  return parsed === null ? MISSING : `${(parsed * 100).toFixed(0)}%`
}

function scalar(value: unknown): string {
  if (value === null || value === undefined) return MISSING
  if (typeof value === 'string') return text(value) ?? MISSING
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : MISSING
  if (typeof value === 'boolean') return String(value)
  return MISSING
}

function joinPresent(parts: Array<string | null>): string {
  return parts.filter((part): part is string => part !== null).join(' · ')
}

function eventLines(event: Record<string, unknown>): string[] {
  const lines: string[] = []
  const headline = text(event.title) ?? text(event.headline)
  if (headline) lines.push(`- ${headline}`)
  const description = text(event.description)
  if (description) lines.push(`- Description: ${description}`)
  const facts = joinPresent([
    text(event.event_type) ? `type: ${event.event_type}` : null,
    event.severity != null ? `severity: ${scalar(event.severity)}` : null,
    text(event.status) ? `status: ${event.status}` : null,
    text(event.event_date) ? `date: ${event.event_date}` : null,
  ])
  if (facts) lines.push(`- ${facts}`)
  return lines
}

function sourceLines(sources: ObservationSource[]): string[] {
  return sources.map((source, index) => {
    const title = text(source.title) ?? text(source.reference) ?? MISSING
    return joinPresent([
      `[${index + 1}] ${title}`,
      `provider: ${text(source.provider) ?? MISSING}`,
      `published: ${text(source.published_at) ?? MISSING}`,
      `relevance: ${source.relevance != null ? percent(source.relevance) : MISSING}`,
      text(source.url),
    ])
  })
}

function assetLines(asset: AffectedAsset): string {
  const label = text(asset.ticker) ?? text(asset.name) ?? MISSING
  return joinPresent([
    `asset: ${label}`,
    asset.estimated_move != null ? `est. move: ${scalar(asset.estimated_move)}` : null,
    asset.volatility_impact != null ? `volatility impact: ${scalar(asset.volatility_impact)}` : null,
    text(asset.time_horizon) ? `horizon: ${asset.time_horizon}` : null,
    asset.current_price != null ? `current price: ${scalar(asset.current_price)}` : null,
    text(asset.price_direction) ? `direction: ${asset.price_direction}` : null,
  ])
}

function impactLines(impact: ObservationImpact, index: number): string[] {
  const lines: string[] = []
  const facts = joinPresent([
    `entity: ${text(impact.entity_name) ?? MISSING}`,
    text(impact.entity_type) ? `type: ${impact.entity_type}` : null,
    text(impact.impact_direction) ? `direction: ${impact.impact_direction}` : null,
    impact.impact_score != null ? `score: ${scalar(impact.impact_score)}` : null,
    impact.confidence != null ? `confidence: ${percent(impact.confidence)}` : MISSING,
  ])
  lines.push(`[${index + 1}] ${facts}`)
  const summary = text(impact.analysis_summary)
  if (summary) lines.push(`    - ${summary}`)
  for (const asset of impact.affected_assets ?? []) {
    lines.push(`    - ${assetLines(asset)}`)
  }
  return lines
}

function marketLines(item: MarketObservation): string {
  return joinPresent([
    `${item.symbol}`,
    `status: ${item.status}`,
    item.price != null ? `price: ${scalar(item.price)}` : `price: ${MISSING}`,
    item.change_percent != null ? `change: ${scalar(item.change_percent)}%` : null,
    `provider: ${text(item.provider) ?? MISSING}`,
    `timestamp: ${text(item.timestamp) ?? MISSING}`,
    `freshness: ${text(item.freshness) ?? MISSING}`,
  ])
}

function causalLines(link: CausalLink): string {
  const source = text(link.source) ?? MISSING
  const target = text(link.target) ?? MISSING
  const sourceType = text(link.source_type)
  const targetType = text(link.target_type)
  return joinPresent([
    `${source}${sourceType ? ` (${sourceType})` : ''} -> ${target}${targetType ? ` (${targetType})` : ''}`,
    `confidence: ${link.confidence != null ? percent(link.confidence) : MISSING}`,
    text(link.evidence_ref) ? `evidence: ${link.evidence_ref}` : null,
  ])
}

/**
 * Build the deterministic briefing for the canonical observation currently
 * displayed for `selection`. Returns `null` when no observation is loaded —
 * a previous entity's evidence is never re-rendered here.
 */
export function buildEvidenceBriefing(
  evidence: Pick<AtlasEvidenceState, 'selection' | 'observation' | 'lastUpdatedAt'>,
): EvidenceBriefing | null {
  const { selection, observation, lastUpdatedAt } = evidence
  if (!observation) return null

  const status = observation.status
  const freshness = observation.freshness ?? 'unknown'
  const notEstablished: string[] = []
  const sections: string[] = []

  const header = [
    `Selection: ${selection ?? observation.query ?? 'none'}`,
    `Observation status: ${status}`,
    `Freshness: ${freshness}`,
    joinPresent([
      `provider: ${text(observation.provenance?.provider) ?? MISSING}`,
      `observed at: ${text(observation.provenance?.observed_at) ?? MISSING}`,
      `confidence: ${percent(observation.confidence ?? observation.provenance?.confidence)}`,
    ]),
    lastUpdatedAt ? `Last updated in UI: ${lastUpdatedAt}` : null,
    observation.query ? `Query: ${observation.query}` : null,
  ].filter((line): line is string => line !== null)
  sections.push(header.join('\n'))

  // What happened
  const eventLinesRendered = observation.event ? eventLines(observation.event) : []
  const contextLines = [
    (observation.entities ?? []).length ? `Entities: ${observation.entities!.join(', ')}` : null,
    (observation.countries ?? []).length ? `Countries: ${observation.countries!.join(', ')}` : null,
  ].filter((line): line is string => line !== null)
  if (eventLinesRendered.length || contextLines.length) {
    sections.push(['WHAT HAPPENED', ...eventLinesRendered, ...contextLines].join('\n'))
  } else {
    sections.push('WHAT HAPPENED\nNOT ESTABLISHED: the evidence does not establish what happened — this observation contains no event record.')
    notEstablished.push('what happened (no event record)')
  }

  // Sources
  const sources = observation.sources ?? []
  if (sources.length) {
    sections.push([`SOURCES (${sources.length})`, ...sourceLines(sources).map(line => `- ${line}`)].join('\n'))
  } else {
    sections.push('SOURCES (0)\nNOT ESTABLISHED: the evidence does not establish any supporting sources — no source records were returned.')
    notEstablished.push('supporting sources (no source records)')
  }

  // Impacts
  const impacts = observation.impacts ?? []
  if (impacts.length) {
    const lines = impacts.flatMap((impact, index) => impactLines(impact, index).map((line, i) => (i === 0 ? `- ${line}` : line)))
    sections.push([`IMPACTS (${impacts.length})`, ...lines].join('\n'))
  } else {
    sections.push('IMPACTS (0)\nNOT ESTABLISHED: the evidence does not establish any impacts — no impact records were returned.')
    notEstablished.push('impacts (no impact records)')
  }

  // Assets and markets
  const envelopeAssets = observation.assets ?? []
  const impactedAssets = impacts.flatMap(impact => impact.affected_assets ?? [])
  const markets = observation.market_observations ?? []
  if (envelopeAssets.length || impactedAssets.length || markets.length) {
    const lines = [
      ...envelopeAssets.map(asset => `- Listed asset: ${asset}`),
      ...impactedAssets.map(asset => `- ${assetLines(asset)}`),
      ...markets.map(item => `- Market: ${marketLines(item)}`),
    ]
    sections.push(['ASSETS AND MARKETS', ...lines].join('\n'))
  } else {
    sections.push('ASSETS AND MARKETS\nNOT ESTABLISHED: the evidence does not establish affected assets or markets — no asset or market records were returned.')
    notEstablished.push('affected assets or markets (no asset or market records)')
  }

  // Causal relationships
  const causal = observation.causal_chain ?? []
  if (causal.length) {
    sections.push([`CAUSAL RELATIONSHIPS (${causal.length})`, ...causal.map(link => `- ${causalLines(link)}`)].join('\n'))
  } else {
    sections.push('CAUSAL RELATIONSHIPS (0)\nNOT ESTABLISHED: the evidence does not establish causal relationships — no causal links were returned.')
    notEstablished.push('causal relationships (no causal links)')
  }

  // Freshness / confidence / uncertainty
  const uncertainty = observation.uncertainty ?? []
  const limitations = observation.limitations ?? []
  const providerStatus = observation.provider_status ?? {}
  const confidenceValue = observation.confidence ?? observation.provenance?.confidence ?? null
  const uncertaintyLines = [
    `- Freshness: ${freshness}`,
    `- Confidence: ${percent(confidenceValue)}`,
    uncertainty.length
      ? `- Uncertainty:\n${uncertainty.map(item => `    · ${item}`).join('\n')}`
      : '- Uncertainty: no uncertainty statements recorded.',
    limitations.length
      ? `- Limitations:\n${limitations.map(item => `    · ${item}`).join('\n')}`
      : '- Limitations: no limitations recorded.',
    Object.keys(providerStatus).length
      ? `- Provider status: ${Object.entries(providerStatus).map(([provider, state]) => `${provider}=${state}`).join(', ')}`
      : '- Provider status: no provider status recorded.',
  ]
  sections.push(['FRESHNESS, CONFIDENCE, AND UNCERTAINTY', ...uncertaintyLines].join('\n'))

  if (confidenceValue === null) notEstablished.push('confidence (not provided)')
  if (text(observation.provenance?.provider) === null) notEstablished.push('provider provenance (not provided)')
  if (text(observation.provenance?.observed_at) === null) notEstablished.push('observation timestamp (not provided)')
  if (!uncertainty.length) notEstablished.push('uncertainty statements (none recorded)')

  const notEstablishedSection = [
    'NOT ESTABLISHED BY THIS EVIDENCE',
    ...(notEstablished.length
      ? notEstablished.map(item => `- The evidence does not establish ${item}.`)
      : ['- The observation records every section listed above; gaps are stated inline as NOT PROVIDED.']),
  ]
  sections.push(notEstablishedSection.join('\n'))

  return {
    selection,
    status,
    freshness,
    text: sections.join('\n\n'),
    notEstablished,
  }
}

/**
 * Deterministic, evidence-grounded answer for "Ask ATLAS about this evidence".
 * When the observation is missing a section, the answer states that the
 * evidence does not establish it rather than inventing an explanation.
 */
export function answerFromEvidence(evidence: AtlasEvidenceState): string {
  const { selection, status, observation, error } = evidence
  const target = selection ? `"${selection}"` : 'the current selection'

  if (status === 'ready' && observation) {
    const briefing = buildEvidenceBriefing(evidence)
    const lead = observation.status === 'unavailable'
      ? `The canonical observation for ${target} is marked unavailable: the evidence does not establish an answer.`
      : `Grounded in the canonical evidence currently displayed for ${target} (${observation.status} · freshness ${observation.freshness ?? 'unknown'}).`
    return briefing ? `${lead}\n\n${briefing.text}` : lead
  }
  if (status === 'loading') {
    return `Evidence for ${target} is still loading. There is no canonical observation to ground an answer in yet, so I will not substitute an explanation.`
  }
  if (status === 'error') {
    return `The evidence request for ${target} failed${error ? `: ${error}` : ''}. No canonical observation is displayed, so the evidence cannot establish an answer.`
  }
  return 'No globe selection is active, so there is no canonical evidence to answer from.'
}

const EVIDENCE_QUESTION_TERMS = [
  'evidence',
  'source',
  'impact',
  'causal',
  'confidence',
  'uncertainty',
  'freshness',
  'provenance',
  'observation',
  'limitation',
  'what happened',
  'affected',
  'recorded',
  'why',
]

/** Detect questions that must be answered from the canonical observation. */
export function looksLikeEvidenceQuestion(query: string): boolean {
  const lower = query.toLowerCase()
  return EVIDENCE_QUESTION_TERMS.some(term => lower.includes(term))
}

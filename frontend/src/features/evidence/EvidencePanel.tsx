import { AlertTriangle, ArrowRight, Brain, Loader2, Radio, RefreshCw, ShieldQuestion } from 'lucide-react'
import Panel from '../../components/ui/Panel'
import ProgressBar from '../../components/ui/ProgressBar'
import EvidenceStatusBadge from './EvidenceStatusBadge'
import { evidenceStatusMeta } from './evidenceStatus'
import { affectedAssetEntity, causalNodeEntity } from '../../api/evidenceApi'
import type { AffectedAsset, CausalLink, MarketObservation, ObservationImpact, ObservationSource } from '../../api/evidenceApi'
import type { AtlasEvidenceState } from '../../stores/AtlasStore'

export interface EvidencePanelProps {
  evidence: AtlasEvidenceState
  /** Ask ATLAS about the currently displayed canonical evidence. */
  onAskAtlas?: (selection: string) => void
  /**
   * Navigate to a related entity through the existing globe selection system.
   * Only called for entities backed by a reliable reference in the observation.
   */
  onSelectEntity?: (entity: string) => void
  /** Refresh the current observation in place, preserving the selection. */
  onRefresh?: () => void
  className?: string
}

const NOT_PROVIDED = 'NOT PROVIDED'
const UNAVAILABLE = 'UNAVAILABLE'

function formatTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString()
}

function formatNumber(value: unknown, digits = 2): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

function formatPercent(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

function Field({ label, value, fallback = NOT_PROVIDED }: { label: string; value: string | null | undefined; fallback?: string }) {
  const shown = value && String(value).trim() ? String(value) : fallback
  const missing = !value || !String(value).trim()
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[9px] tracking-wider text-[var(--text-lo)] shrink-0">{label}</span>
      <span className={`text-[10px] text-right break-words ${missing ? 'text-[var(--warning)]' : 'text-[var(--text-hi)]'}`}>
        {shown}
      </span>
    </div>
  )
}

function EmptyNote({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded border border-dashed border-[var(--line)] px-2 py-1.5">
      <ShieldQuestion size={12} className="text-[var(--text-lo)] shrink-0" aria-hidden="true" />
      <span className="text-[9px] font-mono tracking-wide text-[var(--text-lo)]">{children}</span>
    </div>
  )
}

function ConfidenceRow({ confidence }: { confidence: number | null | undefined }) {
  if (typeof confidence !== 'number' || !Number.isFinite(confidence)) {
    return <Field label="CONFIDENCE" value={null} fallback={UNAVAILABLE} />
  }
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[9px] tracking-wider">
        <span className="text-[var(--text-lo)]">CONFIDENCE</span>
        <span className="text-[var(--text-hi)]">{(confidence * 100).toFixed(0)}%</span>
      </div>
      <ProgressBar value={confidence * 100} color={confidence >= 0.7 ? 'var(--positive)' : confidence >= 0.4 ? 'var(--warning)' : 'var(--critical)'} />
    </div>
  )
}

function SourceRow({ source }: { source: ObservationSource }) {
  const title = source.title?.trim() || source.reference?.trim() || UNAVAILABLE
  const published = formatTimestamp(source.published_at)
  return (
    <div className="rounded border border-[var(--line)] bg-[rgba(11,22,33,0.4)] p-2 space-y-1">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] leading-snug text-[var(--text-hi)] break-words">{title}</span>
        {typeof source.relevance === 'number' && (
          <span className="text-[9px] font-mono text-[var(--text-lo)] shrink-0">REL {(source.relevance * 100).toFixed(0)}%</span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 text-[9px] font-mono text-[var(--text-lo)]">
        <span>{source.provider?.trim() || UNAVAILABLE}</span>
        <span>{published ?? 'TIMESTAMP UNAVAILABLE'}</span>
      </div>
      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[9px] font-mono text-[var(--accent)] hover:underline break-all"
        >
          OPEN SOURCE <ArrowRight size={9} />
        </a>
      )}
    </div>
  )
}

/**
 * Renders an affected asset. When the record carries a canonical ticker or
 * name and a navigation handler is available, the chip becomes a button that
 * reuses the globe selection system; otherwise it stays an inert label.
 */
function AffectedAssetChip({ asset, onSelectEntity }: { asset: AffectedAsset; onSelectEntity?: (entity: string) => void }) {
  const label = asset.ticker || asset.name || UNAVAILABLE
  const target = affectedAssetEntity(asset)
  if (target && onSelectEntity) {
    return (
      <button
        type="button"
        onClick={() => onSelectEntity(target)}
        title={`Focus ${target} on the globe`}
        className="text-[8px] font-mono px-1 py-0.5 rounded border border-[rgba(56,232,255,0.35)] text-[var(--accent)] hover:bg-[rgba(56,232,255,0.12)] transition-colors"
      >
        {label}
      </button>
    )
  }
  return (
    <span className="text-[8px] font-mono px-1 py-0.5 rounded border border-[var(--line)] text-[var(--text-mid)]">
      {label}
    </span>
  )
}

function ImpactRow({ impact, onSelectEntity }: { impact: ObservationImpact; onSelectEntity?: (entity: string) => void }) {
  const confidence = typeof impact.confidence === 'number' ? `${(impact.confidence * 100).toFixed(0)}%` : UNAVAILABLE
  return (
    <div className="rounded border border-[var(--line)] bg-[rgba(11,22,33,0.4)] p-2 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold text-[var(--text-hi)] break-words">{impact.entity_name || UNAVAILABLE}</span>
        <span className="text-[9px] font-mono text-[var(--text-lo)]">{impact.impact_direction?.toUpperCase() || UNAVAILABLE}</span>
      </div>
      <div className="flex items-center justify-between text-[9px] font-mono text-[var(--text-lo)]">
        <span>{impact.entity_type?.toUpperCase() || UNAVAILABLE}</span>
        <span>CONF {confidence}</span>
      </div>
      {typeof impact.impact_score === 'number' && (
        <ProgressBar value={Math.min(100, Math.abs(impact.impact_score) * (impact.impact_score <= 1 ? 100 : 1))} color={impact.impact_score >= 0 ? 'var(--positive)' : 'var(--critical)'} />
      )}
      {impact.analysis_summary && <p className="text-[9px] leading-snug text-[var(--text-mid)]">{impact.analysis_summary}</p>}
      {(impact.affected_assets ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {(impact.affected_assets ?? []).map((asset, index) => (
            <AffectedAssetChip key={`${asset.ticker ?? asset.name ?? index}`} asset={asset} onSelectEntity={onSelectEntity} />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Renders one side of a causal link. Only nodes with a reliable entity
 * reference (geography/entity/asset) become navigable; narrative event nodes
 * remain inert labels so no relationship is invented.
 */
function CausalNode({ link, side, onSelectEntity }: { link: CausalLink; side: 'source' | 'target'; onSelectEntity?: (entity: string) => void }) {
  const value = side === 'source' ? link.source : link.target
  const label = value || UNAVAILABLE
  const entity = causalNodeEntity(link, side)
  if (entity && onSelectEntity) {
    return (
      <button
        type="button"
        onClick={() => onSelectEntity(entity)}
        title={`Focus ${entity} on the globe`}
        className="text-[var(--accent)] hover:underline break-words text-left"
      >
        {label}
      </button>
    )
  }
  return <span className="text-[var(--text-hi)] break-words">{label}</span>
}

function MarketObservationRow({ item }: { item: MarketObservation }) {
  const change = formatPercent(item.change_percent)
  return (
    <div className="rounded border border-[var(--line)] bg-[rgba(11,22,33,0.4)] p-2 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono font-semibold text-[var(--text-hi)]">{item.symbol}</span>
        <EvidenceStatusBadge status={item.status === 'provider-backed' ? 'live' : item.status === 'simulated' ? 'demo' : item.status === 'cached' ? 'stale' : 'unavailable'} />
      </div>
      {item.status === 'unavailable' ? (
        <p className="text-[9px] font-mono text-[var(--text-lo)]">Market quote unavailable — no provider value was returned.</p>
      ) : (
        <>
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-[var(--text-hi)]">{formatNumber(item.price, 2) ?? UNAVAILABLE}</span>
            <span style={{ color: typeof item.change_percent === 'number' && item.change_percent < 0 ? 'var(--critical)' : 'var(--positive)' }}>
              {change ?? UNAVAILABLE}
            </span>
          </div>
          <div className="flex items-center justify-between text-[8px] font-mono text-[var(--text-lo)]">
            <span>{item.provider || UNAVAILABLE}</span>
            <span>
              {(item.freshness || 'unknown').toUpperCase()} · {formatTimestamp(item.timestamp) ?? 'TIMESTAMP UNAVAILABLE'}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Evidence Intelligence Panel — renders the canonical `EvidenceObservation`
 * envelope for the selected globe entity. It performs no fetching and no
 * synthesis: every value shown comes from the observation, and missing
 * optional fields are rendered as explicitly unavailable.
 */
export default function EvidencePanel({ evidence, onAskAtlas, onSelectEntity, onRefresh, className = '' }: EvidencePanelProps) {
  const { selection, status, observation, error, refreshing, lastUpdatedAt } = evidence
  const meta = evidenceStatusMeta(observation?.status)
  // A refresh failure on an already-displayed observation: keep the evidence,
  // but state plainly that the refresh did not succeed.
  const refreshError = status === 'ready' && !refreshing && error ? error : null

  return (
    <div className={`flex flex-col gap-0 font-mono select-none ${className}`} data-testid="evidence-panel">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--line)]">
        <div className="flex items-center gap-2">
          <Radio size={13} className="text-[var(--accent)]" aria-hidden="true" />
          <span className="panel-title tracking-wider">EVIDENCE INTELLIGENCE</span>
        </div>
        <div className="flex items-center gap-1.5">
          {onRefresh && selection && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing || status === 'loading'}
              title="Refresh evidence for the current selection"
              aria-label="Refresh evidence"
              data-testid="evidence-refresh"
              className="flex items-center justify-center rounded border border-[var(--line)] p-1 text-[var(--text-lo)] hover:text-[var(--accent)] hover:border-[rgba(56,232,255,0.35)] disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
            </button>
          )}
          {observation && <EvidenceStatusBadge status={observation.status} />}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-3">
        {status === 'idle' && !selection && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Radio size={20} className="opacity-50 text-[var(--accent)]" aria-hidden="true" />
            <p className="text-[10px] text-[var(--text-lo)] leading-relaxed">
              SELECT AN EVENT OR ENTITY ON THE GLOBE
              <br />
              TO INSPECT ITS CANONICAL EVIDENCE
            </p>
          </div>
        )}

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-2 py-6 text-center" data-testid="evidence-loading">
            <Loader2 size={18} className="animate-spin text-[var(--accent)]" aria-hidden="true" />
            <p className="text-[10px] text-[var(--text-mid)] tracking-wider">FETCHING EVIDENCE FOR {selection?.toUpperCase()}</p>
          </div>
        )}

        {status === 'error' && (
          <div data-testid="evidence-error">
            <Panel glow="critical">
              <div className="flex flex-col items-center gap-2 py-2 text-center">
                <AlertTriangle size={16} className="text-[var(--critical)]" aria-hidden="true" />
                <p className="text-[10px] text-[var(--text-mid)]">{error ?? 'Evidence service unavailable'}</p>
                <p className="text-[9px] text-[var(--text-lo)]">No evidence was fabricated for {selection?.toUpperCase()}.</p>
              </div>
            </Panel>
          </div>
        )}

        {status === 'ready' && observation && (
          <>
            {/* ── Status / freshness / provider ─────────────────────────── */}
            <Panel
              title={selection ?? observation.query ?? 'EVIDENCE'}
              right={<EvidenceStatusBadge status={observation.status} />}
              glow={observation.status === 'live' ? 'positive' : observation.status === 'degraded' || observation.status === 'stale' ? 'warning' : undefined}
              corners
            >
              <div className="space-y-1.5">
                <Field label="FRESHNESS" value={observation.freshness?.toUpperCase()} />
                <Field label="PROVIDER" value={observation.provenance?.provider} />
                <Field label="OBSERVED AT" value={formatTimestamp(observation.provenance?.observed_at)} />
                <Field label="LAST UPDATED" value={formatTimestamp(lastUpdatedAt)} />
                <ConfidenceRow confidence={observation.confidence ?? observation.provenance?.confidence} />
                {(refreshing || refreshError) && (
                  <div className="flex items-start gap-1.5 pt-1" data-testid="evidence-refresh-state">
                    {refreshing ? (
                      <>
                        <Loader2 size={11} className="animate-spin text-[var(--accent)] shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="text-[9px] tracking-wider text-[var(--accent)]">REFRESHING IN PLACE</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={11} className="text-[var(--warning)] shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="text-[9px] tracking-wider text-[var(--warning)]" data-testid="evidence-refresh-error">
                          REFRESH FAILED · SHOWING LAST OBSERVATION
                        </span>
                      </>
                    )}
                  </div>
                )}
                <p className="text-[9px] text-[var(--text-lo)] pt-1 border-t border-[var(--line)]">
                  {meta.meaning}
                </p>
              </div>
            </Panel>

            {/* ── Event ─────────────────────────────────────────────────── */}
            <Panel title="Event">
              {observation.event ? (
                <div className="space-y-1.5">
                  <p className="text-[11px] leading-snug text-[var(--text-hi)]">
                    {String(observation.event.title ?? observation.event.headline ?? UNAVAILABLE)}
                  </p>
                  {typeof observation.event.description === 'string' && observation.event.description.trim() && (
                    <p className="text-[10px] leading-snug text-[var(--text-mid)]">{observation.event.description}</p>
                  )}
                  <Field label="TYPE" value={typeof observation.event.event_type === 'string' ? observation.event.event_type.toUpperCase() : null} />
                  <Field label="SEVERITY" value={observation.event.severity != null ? String(observation.event.severity) : null} />
                  <Field label="EVENT STATUS" value={typeof observation.event.status === 'string' ? observation.event.status.toUpperCase() : null} />
                  <Field label="EVENT DATE" value={formatTimestamp(observation.event.event_date)} />
                  <Field label="ENTITIES" value={(observation.entities ?? []).join(', ') || null} />
                  <Field label="COUNTRIES" value={(observation.countries ?? []).join(', ') || null} />
                </div>
              ) : (
                <EmptyNote>NO EVENT RECORD IN THIS OBSERVATION</EmptyNote>
              )}
            </Panel>

            {/* ── Sources / provenance ──────────────────────────────────── */}
            <Panel title={`Sources · ${(observation.sources ?? []).length}`}>
              {(observation.sources ?? []).length > 0 ? (
                <div className="space-y-2">
                  {(observation.sources ?? []).map((source, index) => (
                    <SourceRow key={source.reference || source.url || index} source={source} />
                  ))}
                </div>
              ) : (
                <EmptyNote>NO SOURCE RECORDS WERE RETURNED</EmptyNote>
              )}
              {(observation.provenance?.references ?? []).length > 0 && (
                <div className="mt-2 pt-2 border-t border-[var(--line)]">
                  <span className="text-[9px] tracking-wider text-[var(--text-lo)]">PROVENANCE REFERENCES</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(observation.provenance?.references ?? []).map(reference => (
                      <span key={reference} className="text-[8px] font-mono px-1 py-0.5 rounded border border-[var(--line)] text-[var(--text-mid)]">
                        {reference}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Panel>

            {/* ── Impacts ───────────────────────────────────────────────── */}
            <Panel title={`Impacts · ${(observation.impacts ?? []).length}`}>
              {(observation.impacts ?? []).length > 0 ? (
                <div className="space-y-2">
                  {(observation.impacts ?? []).map((impact, index) => (
                    <ImpactRow key={impact.id ?? `${impact.entity_name ?? 'impact'}-${index}`} impact={impact} onSelectEntity={onSelectEntity} />
                  ))}
                </div>
              ) : (
                <EmptyNote>NO IMPACT RECORDS WERE RETURNED</EmptyNote>
              )}
            </Panel>

            {/* ── Market observations ───────────────────────────────────── */}
            <Panel title={`Markets · ${(observation.market_observations ?? []).length}`}>
              {(observation.market_observations ?? []).length > 0 ? (
                <div className="space-y-2">
                  {(observation.market_observations ?? []).map(item => (
                    <MarketObservationRow key={item.symbol} item={item} />
                  ))}
                </div>
              ) : (
                <EmptyNote>NO MARKET OBSERVATIONS WERE RETURNED</EmptyNote>
              )}
            </Panel>

            {/* ── Causal chain ──────────────────────────────────────────── */}
            <Panel title={`Causal Chain · ${(observation.causal_chain ?? []).length}`}>
              {(observation.causal_chain ?? []).length > 0 ? (
                <div className="space-y-1.5">
                  {(observation.causal_chain ?? []).map((edge, index) => (
                    <div key={`${edge.source ?? index}-${edge.target ?? index}`} className="flex items-center gap-1.5 text-[9px]">
                      <CausalNode link={edge} side="source" onSelectEntity={onSelectEntity} />
                      <ArrowRight size={10} className="text-[var(--accent)] shrink-0" aria-hidden="true" />
                      <CausalNode link={edge} side="target" onSelectEntity={onSelectEntity} />
                      <span className="ml-auto font-mono text-[var(--text-lo)] shrink-0">
                        {typeof edge.confidence === 'number' ? `${(edge.confidence * 100).toFixed(0)}%` : UNAVAILABLE}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyNote>NO CAUSAL LINKS WERE RETURNED</EmptyNote>
              )}
            </Panel>

            {/* ── Provider status / uncertainty ─────────────────────────── */}
            <Panel title="Provider Status">
              {Object.keys(observation.provider_status ?? {}).length > 0 ? (
                <div className="space-y-1.5">
                  {Object.entries(observation.provider_status ?? {}).map(([provider, providerState]) => (
                    <div key={provider} className="flex items-center justify-between gap-2">
                      <span className="text-[9px] tracking-wider text-[var(--text-lo)] uppercase">{provider.replace(/_/g, ' ')}</span>
                      <EvidenceStatusBadge status={providerState} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyNote>NO PROVIDER STATUS WAS RETURNED</EmptyNote>
              )}

              {(observation.uncertainty ?? []).length > 0 && (
                <div className="mt-2 pt-2 border-t border-[var(--line)] space-y-1">
                  <span className="text-[9px] tracking-wider text-[var(--warning)]">UNCERTAINTY</span>
                  {(observation.uncertainty ?? []).map((item, index) => (
                    <p key={index} className="text-[9px] leading-snug text-[var(--text-mid)]">· {item}</p>
                  ))}
                </div>
              )}

              {(observation.limitations ?? []).length > 0 && (
                <div className="mt-2 pt-2 border-t border-[var(--line)] space-y-1">
                  <span className="text-[9px] tracking-wider text-[var(--text-lo)]">LIMITATIONS</span>
                  {(observation.limitations ?? []).map((item, index) => (
                    <p key={index} className="text-[9px] leading-snug text-[var(--text-lo)]">· {item}</p>
                  ))}
                </div>
              )}
            </Panel>

            {onAskAtlas && selection && (
              <button
                type="button"
                onClick={() => onAskAtlas(selection)}
                className="flex items-center justify-center gap-2 rounded-md border border-[rgba(56,232,255,0.35)] bg-[rgba(56,232,255,0.1)] py-2 text-[10px] font-semibold tracking-wider text-[var(--accent)] hover:bg-[rgba(56,232,255,0.18)] transition-colors"
              >
                <Brain size={12} aria-hidden="true" />
                ASK ATLAS ABOUT THIS EVIDENCE
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

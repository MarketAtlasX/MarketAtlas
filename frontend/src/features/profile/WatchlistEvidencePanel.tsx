import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, Globe2, Loader2, RefreshCw, X } from 'lucide-react'
import Panel from '../../components/ui/Panel'
import Badge from '../../components/ui/Badge'
import { getWatchlistEvidence } from '../../api/profileApi'
import { commandBus } from '../../assistant/commands/commandBus'
import { createCommand } from '../../assistant/commands/commandTypes'
import type { WatchlistEvidence } from '../../types'
import { apiError, relativeTime } from './watchlistUtils'

type LoadState = 'loading' | 'ready' | 'error'

const RELIABILITY_TONE = {
  recorded: 'positive',
  candidate: 'warning',
  none: 'neutral',
} as const

const RELIABILITY_LABEL = {
  recorded: 'RECORDED LINK',
  candidate: 'CANDIDATE MATCH',
  none: 'NO ASSOCIATION',
} as const

interface WatchlistEvidencePanelProps {
  itemId: string
  ticker: string
  onClose: () => void
}

export default function WatchlistEvidencePanel({ itemId, ticker, onClose }: WatchlistEvidencePanelProps) {
  const [state, setState] = useState<LoadState>('loading')
  const [evidence, setEvidence] = useState<WatchlistEvidence | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      setEvidence(await getWatchlistEvidence(itemId))
      setState('ready')
    } catch (err) {
      setError(apiError(err, 'Unable to load geopolitical evidence for this asset.'))
      setState('error')
    }
  }, [itemId])

  useEffect(() => {
    void load()
  }, [load])

  const focusGlobe = () => {
    const geography = evidence?.geography
    const target = geography?.country_code || geography?.region || geography?.label
    if (!target) return
    commandBus.emit(createCommand('FOCUS_COUNTRY', { country: target }))
  }

  return (
    <Panel
      title={`EVIDENCE · ${ticker}`}
      corners
      glow={state === 'error' ? 'critical' : undefined}
      right={
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => void load()}
            title="Refresh evidence"
            aria-label="Refresh evidence"
            className="rounded border border-[var(--line)] p-1.5 text-[var(--text-mid)] transition-colors hover:text-[var(--accent)]"
          >
            <RefreshCw size={12} className={state === 'loading' ? 'animate-spin' : undefined} />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close evidence"
            aria-label="Close evidence"
            className="rounded border border-[var(--line)] p-1.5 text-[var(--text-lo)] transition-colors hover:text-[var(--text-hi)]"
          >
            <X size={12} />
          </button>
        </div>
      }
    >
      {state === 'loading' && (
        <div className="flex items-center gap-2 py-4 text-xs text-[var(--text-mid)]">
          <Loader2 size={13} className="animate-spin text-[var(--accent)]" />
          Loading evidence for {ticker}...
        </div>
      )}

      {state === 'error' && (
        <div className="space-y-2">
          <p className="text-[11px] text-[var(--critical)]">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded border border-[rgba(56,232,255,0.35)] px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--accent)]"
          >
            Retry
          </button>
        </div>
      )}

      {state === 'ready' && evidence && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={RELIABILITY_TONE[evidence.association_reliability]}>
              {RELIABILITY_LABEL[evidence.association_reliability]}
            </Badge>
            {evidence.entity && (
              <span className="text-[10px] font-mono text-[var(--text-mid)]">
                {evidence.entity.name}
                {evidence.entity.country_code ? ` · ${evidence.entity.country_code}` : ''}
              </span>
            )}
            {evidence.geography && (
              <button
                type="button"
                onClick={focusGlobe}
                className="ml-auto flex items-center gap-1.5 rounded border border-[rgba(56,232,255,0.35)] px-2 py-1 text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--accent)] transition-colors hover:bg-[rgba(56,232,255,0.12)]"
                title={`Focus the globe on ${evidence.geography.label}`}
              >
                <Globe2 size={11} />
                Focus globe
              </button>
            )}
          </div>

          {/* Epistemic guardrail: never present association as causation. */}
          <p className="border border-[rgba(245,185,65,0.3)] bg-[rgba(245,185,65,0.06)] px-2.5 py-1.5 text-[9px] font-mono leading-relaxed text-[var(--warning)]">
            {evidence.uncertainty[0] ??
              'Correlation is not causation: associations shown here do not establish that an event caused a price move.'}
          </p>

          <section>
            <h4 className="mb-1 text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--text-lo)]">
              Recorded events ({evidence.events.length})
            </h4>
            {evidence.events.length === 0 ? (
              <p className="text-[10px] text-[var(--text-lo)]">
                No recorded event links for this entity.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {evidence.events.map(event => (
                  <li key={event.id} className="border border-[var(--line)] bg-[rgba(6,12,18,0.4)] px-2.5 py-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] text-[var(--text-hi)]">{event.title}</span>
                      <Badge tone={event.severity === 'high' || event.severity === 'critical' ? 'critical' : 'neutral'}>
                        {event.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[9px] font-mono text-[var(--text-lo)]">
                      <span>{event.event_type.toUpperCase()}</span>
                      <span>{relativeTime(event.event_date)}</span>
                      {event.source && <span>{event.source}</span>}
                      {event.source_url && (
                        <a
                          href={event.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[var(--accent)] hover:underline"
                        >
                          <ExternalLink size={9} /> Source
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h4 className="mb-1 text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--text-lo)]">
              Live-event candidates ({evidence.live_events.length})
            </h4>
            {evidence.live_events.length === 0 ? (
              <p className="text-[10px] text-[var(--text-lo)]">
                No live events currently match this ticker.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {evidence.live_events.map(event => (
                  <li key={event.id} className="border border-[var(--line)] bg-[rgba(6,12,18,0.4)] px-2.5 py-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] text-[var(--text-hi)]">{event.title}</span>
                      <Badge tone={event.severity >= 7 ? 'critical' : 'warning'}>
                        {event.severity.toFixed(1)}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[9px] font-mono text-[var(--text-lo)]">
                      <span>{event.event_type.toUpperCase()}</span>
                      {event.region && <span>{event.region}</span>}
                      <span>{relativeTime(event.first_seen_at)}</span>
                      <span className="text-[var(--warning)]">KEYWORD MATCH · UNVERIFIED LINK</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {(evidence.limitations.length > 0 || evidence.association_methods.length === 0) && (
            <section className="border-t border-[var(--line)] pt-2">
              <h4 className="mb-1 text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--text-lo)]">
                Limitations
              </h4>
              <ul className="space-y-0.5 text-[9px] font-mono text-[var(--text-lo)]">
                {evidence.limitations.map((limitation, index) => (
                  <li key={index}>· {limitation}</li>
                ))}
                {evidence.association_methods.length === 0 && (
                  <li>· No reliable asset↔event association is currently recorded.</li>
                )}
              </ul>
            </section>
          )}
        </div>
      )}
    </Panel>
  )
}

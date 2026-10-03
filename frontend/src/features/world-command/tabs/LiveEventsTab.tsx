import { useWorldStore, MAX_EVENTS } from '../../../stores/WorldStore'
import type { LiveEvent } from '../../../types'
import type { AtlasEvidenceState } from '../../../stores/AtlasStore'
import type { MarketObservation } from '../../../api/evidenceApi'
import Badge from '../../../components/ui/Badge'
import StatusDot from '../../../components/ui/StatusDot'
import EvidenceStatusBadge from '../../evidence/EvidenceStatusBadge'
import { marketStatusMeta } from '../../evidence/evidenceStatus'
import {
  UNAVAILABLE,
  formatMarketChangePercent,
  formatMarketValue,
  marketObservationEntity,
} from '../../evidence/marketObservations'
import { intelligenceBus } from '../../../services/intelligenceBus'
import { parseBackendDate } from '../../../utils/dateUtils'
import {
  TYPE_TONE,
  eventLocation,
  eventProvenance,
  eventStatus,
  formatEventAge,
  severityTone,
  sortEventsNewestFirst,
  statusTone,
} from '../liveEventTimeline'

/** The timeline never renders more than the store retains. */
export const MAX_TIMELINE_ITEMS = MAX_EVENTS

interface LiveEventsTabProps {
  /**
   * Routed through the existing globe selection/focus path by the command
   * center (`handleGlobeSelect`). When omitted (e.g. isolated rendering) the
   * component falls back to the same `WorldStore.selectEntity` selection.
   */
  onSelectEvent?: (event: LiveEvent) => void
  /**
   * Canonical evidence for the current selection. This is the *only* source of
   * market data shown on the timeline — no second fetch path is introduced.
   * Absent (e.g. in isolation) means no market observations are rendered.
   */
  evidence?: AtlasEvidenceState | null
  /** Title of the event currently focused; its row surfaces the market observations. */
  selectedEvent?: string | null
  /** Route an affected-asset click through the existing globe focus path. */
  onSelectEntity?: (entity: string) => void
}

function formatMarketTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const parsed = parseBackendDate(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString()
}

/**
 * Compact market-impact strip for the selected event.
 *
 * Reads `EvidenceObservation.market_observations` from the canonical evidence
 * already loaded for the selection; it fetches nothing itself. Each chip names
 * the affected asset, its available value/change, and its provider status
 * (LIVE / STALE / SIMULATED / UNAVAILABLE), and routes a click back through the
 * globe focus path. When no provider-backed markets exist the strip says so
 * explicitly instead of filling the gap.
 */
function MarketImpactStrip({
  markets,
  status,
  onSelectEntity,
  onSelectFallback,
}: {
  markets: MarketObservation[]
  status: AtlasEvidenceState['status']
  onSelectEntity?: (entity: string) => void
  onSelectFallback: (entity: string) => void
}) {
  if (status === 'loading') {
    return (
      <div data-testid="event-market-loading" className="pt-1.5 text-[8px] font-mono tracking-wider text-[var(--accent)]">
        MARKETS · LOADING CANONICAL EVIDENCE
      </div>
    )
  }
  if (status !== 'ready' || markets.length === 0) {
    return (
      <div data-testid="event-market-unavailable" className="pt-1.5 text-[8px] font-mono tracking-wider text-[var(--warning)]">
        MARKETS UNAVAILABLE
      </div>
    )
  }
  return (
    <div
      data-testid="event-market-observations"
      className="flex gap-1 overflow-x-auto pt-1.5"
    >
      {markets.map(item => {
        const entity = marketObservationEntity(item)
        const meta = marketStatusMeta(item.status)
        const unavailable = item.status === 'unavailable'
        const change = formatMarketChangePercent(item.change_percent)
        const value = unavailable ? UNAVAILABLE : change ?? formatMarketValue(item.price) ?? UNAVAILABLE
        const title = [
          item.symbol,
          item.provider ?? 'PROVIDER UNAVAILABLE',
          (item.freshness || 'unknown').toUpperCase(),
          formatMarketTimestamp(item.timestamp) ?? 'TIMESTAMP UNAVAILABLE',
        ].join(' · ')
        return (
          <button
            key={item.symbol}
            type="button"
            data-testid="event-market-chip"
            data-symbol={item.symbol}
            data-status={item.status}
            disabled={!entity}
            title={title}
            onClick={() => {
              if (!entity) return
              if (onSelectEntity) onSelectEntity(entity)
              else onSelectFallback(entity)
            }}
            className="flex-shrink-0 inline-flex items-center gap-1 rounded border border-[var(--line)] bg-[rgba(11,22,33,0.55)] px-1.5 py-0.5 text-[9px] font-mono hover:border-[rgba(56,232,255,0.45)] disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
          >
            <span className="text-[var(--text-hi)]">{item.symbol}</span>
            <span
              style={{
                color: unavailable
                  ? 'var(--warning)'
                  : typeof item.change_percent === 'number' && item.change_percent < 0
                    ? 'var(--critical)'
                    : 'var(--positive)',
              }}
            >
              {value}
            </span>
            <EvidenceStatusBadge meta={meta} />
          </button>
        )
      })}
    </div>
  )
}

/**
 * Live Event Intelligence Timeline.
 *
 * A compact, newest-first feed of the events already flowing into
 * `WorldStore` via `useLiveWorldSocket`. It adds no store, socket, fetch path,
 * or evidence model — it reads `state.events`, labels each entry by the
 * provenance/status already present, and routes a click back through the
 * existing globe selection so the Evidence → Market/ATLAS pipeline reacts.
 *
 * The focused event's row additionally surfaces the canonical market
 * observations for that selection (from the `evidence` prop), so a user can see
 * which markets are actually affected — and what evidence supports the link —
 * without leaving the timeline.
 */
export default function LiveEventsTab({ onSelectEvent, evidence, selectedEvent, onSelectEntity }: LiveEventsTabProps) {
  const { state, selectEntity } = useWorldStore()
  const now = Date.now()
  const events = sortEventsNewestFirst(state.events).slice(0, MAX_TIMELINE_ITEMS)

  const handleSelect = (event: LiveEvent) => {
    if (onSelectEvent) {
      onSelectEvent(event)
      return
    }
    const location = eventLocation(event)
    if (!location) return
    selectEntity(location)
    intelligenceBus.emit('ENTITY_SELECTED', { entity: location })
  }

  const handleSelectAsset = (entity: string) => {
    if (onSelectEntity) {
      onSelectEntity(entity)
      return
    }
    selectEntity(entity)
    intelligenceBus.emit('ENTITY_SELECTED', { entity })
  }

  const markets = evidence?.observation?.market_observations ?? []

  return (
    <div className="h-full flex gap-2 overflow-x-auto relative" data-testid="live-event-timeline">
      <span className="absolute right-1 top-0 z-10 text-[8px] font-mono tracking-wider text-[var(--warning)]">
        {state.dataMode.toUpperCase()} · {state.updatedAt ? new Date(state.updatedAt).toLocaleTimeString() : 'NO LIVE UPDATE'}
      </span>
      {events.map(e => {
        const status = eventStatus(e, now)
        const location = eventLocation(e)
        const age = formatEventAge(e.timestamp, now)
        const clickable = Boolean(location)
        const focused = Boolean(selectedEvent) && selectedEvent === e.title
        return (
          <div key={e.id} className="flex-shrink-0 w-64 flex flex-col">
            <button
              type="button"
              data-testid="live-event-row"
              data-event-id={e.id}
              data-provenance={eventProvenance(e)}
              data-status={status}
              data-timestamp={e.timestamp}
              disabled={!clickable}
              onClick={() => handleSelect(e)}
              title={clickable ? `Focus ${location} · ${e.timestamp}` : 'No backend location provided'}
              className={`stream-in w-full rounded border bg-[rgba(11,22,33,0.55)] p-2.5 flex flex-col justify-between text-left transition-colors ${
                clickable ? 'border-[var(--line)] hover:border-[rgba(56,232,255,0.45)] cursor-pointer' : 'border-[var(--line)] opacity-70 cursor-not-allowed'
              } ${focused ? 'border-[rgba(56,232,255,0.45)]' : ''}`}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Badge tone={TYPE_TONE[e.type]}>{e.type.toUpperCase()}</Badge>
                <span className="ml-auto inline-flex items-center gap-1">
                  <StatusDot tone={severityTone(e.severity)} pulse={e.severity >= 7 && status === 'LIVE'} />
                  <Badge tone={statusTone(status)}>{status}</Badge>
                </span>
              </div>
              <p className="text-[11px] leading-snug text-[var(--text-hi)] line-clamp-3">{e.title}</p>
              <div className="flex items-center justify-between mt-2 gap-2">
                <span className="text-[9px] font-mono text-[var(--text-lo)] uppercase tracking-wider truncate">
                  {location ?? 'LOCATION UNAVAILABLE'}
                  {age ? ` · ${age}` : ''}
                </span>
                <span className="text-[9px] font-mono shrink-0" style={{ color: e.severity >= 7 ? 'var(--critical)' : 'var(--warning)' }}>
                  SEV {e.severity}/10
                </span>
              </div>
            </button>
            {focused && (
              <MarketImpactStrip
                markets={markets}
                status={evidence?.status ?? 'idle'}
                onSelectEntity={onSelectEntity}
                onSelectFallback={handleSelectAsset}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  BellRing,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react'
import Panel from '../../components/ui/Panel'
import Badge from '../../components/ui/Badge'
import Sparkline from '../../components/ui/Sparkline'
import {
  addToWatchlist,
  getWatchlist,
  getWatchlistHistory,
  getWatchlistQuotes,
  removeFromWatchlist,
  updateWatchlistItem,
} from '../../api/profileApi'
import { formatCurrency } from '../../types'
import type { WatchlistItem, WatchlistQuoteItem } from '../../types'
import type { TradeDraft } from './PortfolioHoldings'
import WatchlistEvidencePanel from './WatchlistEvidencePanel'
import WatchlistAlertsPanel from './WatchlistAlertsPanel'
import {
  WATCHLIST_ASSET_TYPES,
  apiError,
  filterWatchlist,
  formatChangePercent,
  formatPrice,
  formatSigned,
  hasLiveMarket,
  movementTone,
  relativeTime,
  sortWatchlist,
  type WatchlistSortDirection,
  type WatchlistSortKey,
} from './watchlistUtils'

const EMPTY_FORM = {
  ticker: '',
  company_name: '',
  asset_type: 'stock',
  target_price: '',
  stop_loss: '',
  notes: '',
}

const SORT_LABELS: Record<WatchlistSortKey, string> = {
  name: 'Name',
  movement: 'Movement',
  type: 'Type',
  updated: 'Updated',
}

function asUnavailable(item: WatchlistItem): WatchlistQuoteItem {
  return {
    ...item,
    market: {
      status: 'unavailable',
      symbol: item.ticker,
      price: null,
      change: null,
      change_percent: null,
      previous_close: null,
      currency: null,
      provider: null,
      observed_at: null,
      freshness: 'unknown',
      limitations: ['Market data endpoint unavailable.'],
    },
  }
}

interface WatchlistSectionProps {
  onTradeRequest: (draft: TradeDraft) => void
}

export default function WatchlistSection({ onTradeRequest }: WatchlistSectionProps) {
  const [items, setItems] = useState<WatchlistQuoteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [marketDegraded, setMarketDegraded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [sortKey, setSortKey] = useState<WatchlistSortKey>('updated')
  const [sortDir, setSortDir] = useState<WatchlistSortDirection>('desc')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [history, setHistory] = useState<Record<string, number[] | 'loading' | 'unavailable'>>({})
  const [activePanel, setActivePanel] = useState<{ id: string; kind: 'evidence' | 'alerts' } | null>(null)

  const loadWatchlist = useCallback(async () => {
    setLoadError(null)
    try {
      const quotes = await getWatchlistQuotes()
      setItems(quotes)
      setMarketDegraded(false)
    } catch {
      // Degrade gracefully: fall back to the base CRUD list with explicit
      // unavailable market envelopes rather than hiding the watchlist.
      try {
        const base = await getWatchlist()
        setItems(base.map(asUnavailable))
        setMarketDegraded(true)
      } catch (fallbackError) {
        setLoadError(apiError(fallbackError, 'Unable to load your watchlist.'))
        setItems([])
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadWatchlist()
  }, [loadWatchlist])

  const refresh = () => {
    setRefreshing(true)
    setHistory({})
    void loadWatchlist()
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormError(null)
  }

  const openAddForm = () => {
    resetForm()
    setFormOpen(open => !open)
    setNotice(null)
  }

  const openEditForm = (item: WatchlistQuoteItem) => {
    setEditingId(item.id)
    setForm({
      ticker: item.ticker,
      company_name: item.company_name ?? '',
      asset_type: item.asset_type,
      target_price: item.target_price != null ? String(item.target_price) : '',
      stop_loss: item.stop_loss != null ? String(item.stop_loss) : '',
      notes: item.notes ?? '',
    })
    setFormError(null)
    setFormOpen(true)
    setNotice(null)
  }

  const submit = async () => {
    const ticker = form.ticker.trim().toUpperCase()
    if (!editingId && !ticker) {
      setFormError('Enter a ticker symbol.')
      return
    }
    if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker)) {
      setFormError("Ticker must be 1-10 characters using letters, digits, '.' or '-'.")
      return
    }
    const target = form.target_price ? Number(form.target_price) : null
    const stop = form.stop_loss ? Number(form.stop_loss) : null
    if (target != null && (!Number.isFinite(target) || target < 0)) {
      setFormError('Target price must be zero or greater.')
      return
    }
    if (stop != null && (!Number.isFinite(stop) || stop < 0)) {
      setFormError('Stop loss must be zero or greater.')
      return
    }

    setSubmitting(true)
    setFormError(null)
    try {
      if (editingId) {
        await updateWatchlistItem(editingId, {
          company_name: form.company_name.trim() || undefined,
          asset_type: form.asset_type,
          ...(target != null ? { target_price: target } : {}),
          ...(stop != null ? { stop_loss: stop } : {}),
          notes: form.notes.trim() || undefined,
          is_active: true,
        })
        setNotice(`${ticker} updated.`)
      } else {
        await addToWatchlist({
          ticker,
          company_name: form.company_name.trim() || undefined,
          asset_type: form.asset_type,
          ...(target != null ? { target_price: target } : {}),
          ...(stop != null ? { stop_loss: stop } : {}),
          notes: form.notes.trim() || undefined,
        })
        setNotice(`${ticker} added to watchlist.`)
      }
      setFormOpen(false)
      resetForm()
      await loadWatchlist()
    } catch (error) {
      setFormError(apiError(error, 'Could not save the watchlist entry.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemove = async (item: WatchlistQuoteItem) => {
    setBusyId(item.id)
    setLoadError(null)
    setNotice(null)
    try {
      await removeFromWatchlist(item.id)
      if (activePanel?.id === item.id) setActivePanel(null)
      if (expandedId === item.id) setExpandedId(null)
      await loadWatchlist()
      setNotice(`${item.ticker} removed.`)
    } catch (error) {
      setLoadError(apiError(error, 'Could not remove the ticker.'))
    } finally {
      setBusyId(null)
    }
  }

  const toggleExpanded = (item: WatchlistQuoteItem) => {
    const next = expandedId === item.id ? null : item.id
    setExpandedId(next)
    if (next && history[item.id] === undefined) {
      setHistory(prev => ({ ...prev, [item.id]: 'loading' }))
      void getWatchlistHistory(item.id)
        .then(result => {
          setHistory(prev => ({
            ...prev,
            [item.id]:
              result.status === 'provider-backed' && result.points.length >= 2
                ? result.points.map(point => point.close)
                : 'unavailable',
          }))
        })
        .catch(() => setHistory(prev => ({ ...prev, [item.id]: 'unavailable' })))
    }
  }

  const visible = useMemo(
    () => sortWatchlist(filterWatchlist(items, { query, assetType: typeFilter }), sortKey, sortDir),
    [items, query, typeFilter, sortKey, sortDir],
  )

  const activeCount = items.length
  const liveCount = items.filter(item => hasLiveMarket(item.market)).length

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title={`WATCHLIST · ${activeCount}`}
        corners
        right={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={refresh}
              title="Refresh watchlist and market data"
              aria-label="Refresh watchlist"
              className="rounded border border-[var(--line)] p-1.5 text-[var(--text-mid)] transition-colors hover:border-[rgba(56,232,255,0.35)] hover:text-[var(--accent)]"
            >
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : undefined} />
            </button>
            <button
              type="button"
              onClick={openAddForm}
              aria-label={formOpen ? 'Close watchlist form' : 'Add ticker to watchlist'}
              className="rounded border border-[var(--line)] p-1.5 text-[var(--text-mid)] transition-colors hover:border-[rgba(56,232,255,0.35)] hover:text-[var(--accent)]"
            >
              {formOpen ? <X size={12} /> : <Plus size={12} />}
            </button>
          </div>
        }
      >
        {notice && (
          <div className="mb-2 border border-[rgba(46,230,168,0.3)] bg-[rgba(46,230,168,0.06)] px-2.5 py-1.5 text-[10px] font-mono text-[var(--positive)]">
            {notice}
          </div>
        )}

        {marketDegraded && (
          <div className="mb-2 border border-[rgba(245,185,65,0.3)] bg-[rgba(245,185,65,0.06)] px-2.5 py-1.5 text-[10px] font-mono text-[var(--warning)]">
            Live market data is unavailable — prices are hidden rather than estimated.
          </div>
        )}

        {formOpen && (
          <div className="mb-3 space-y-2 border border-[var(--line)] bg-[rgba(6,12,18,0.5)] p-3">
            <input
              type="text"
              value={form.ticker}
              maxLength={20}
              disabled={editingId != null}
              placeholder="Ticker (e.g. NVDA)"
              onChange={e => setForm(prev => ({ ...prev, ticker: e.target.value.toUpperCase() }))}
              className="w-full border border-[var(--line)] bg-[var(--bg-raised)] px-2 py-1.5 font-mono text-[11px] text-[var(--text-hi)] outline-none focus:border-[rgba(56,232,255,0.45)] placeholder:text-[var(--text-lo)] disabled:opacity-60"
            />
            <input
              type="text"
              value={form.company_name}
              maxLength={255}
              placeholder="Company (optional)"
              onChange={e => setForm(prev => ({ ...prev, company_name: e.target.value }))}
              className="w-full border border-[var(--line)] bg-[var(--bg-raised)] px-2 py-1.5 text-[11px] text-[var(--text-hi)] outline-none focus:border-[rgba(56,232,255,0.45)] placeholder:text-[var(--text-lo)]"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="0"
                step="any"
                value={form.target_price}
                placeholder="Target price"
                onChange={e => setForm(prev => ({ ...prev, target_price: e.target.value }))}
                className="border border-[var(--line)] bg-[var(--bg-raised)] px-2 py-1.5 font-mono text-[11px] text-[var(--text-hi)] outline-none focus:border-[rgba(56,232,255,0.45)] placeholder:text-[var(--text-lo)]"
              />
              <input
                type="number"
                min="0"
                step="any"
                value={form.stop_loss}
                placeholder="Stop loss"
                onChange={e => setForm(prev => ({ ...prev, stop_loss: e.target.value }))}
                className="border border-[var(--line)] bg-[var(--bg-raised)] px-2 py-1.5 font-mono text-[11px] text-[var(--text-hi)] outline-none focus:border-[rgba(56,232,255,0.45)] placeholder:text-[var(--text-lo)]"
              />
            </div>
            <input
              type="text"
              value={form.notes}
              maxLength={2000}
              placeholder="Notes (optional)"
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full border border-[var(--line)] bg-[var(--bg-raised)] px-2 py-1.5 text-[11px] text-[var(--text-hi)] outline-none focus:border-[rgba(56,232,255,0.45)] placeholder:text-[var(--text-lo)]"
            />
            <div className="flex items-center gap-2">
              <select
                value={form.asset_type}
                onChange={e => setForm(prev => ({ ...prev, asset_type: e.target.value }))}
                aria-label="Asset type"
                className="flex-1 border border-[var(--line)] bg-[var(--bg-raised)] px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-hi)] outline-none focus:border-[rgba(56,232,255,0.45)]"
              >
                {WATCHLIST_ASSET_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={submitting}
                className="flex items-center gap-1.5 rounded border border-[rgba(56,232,255,0.4)] bg-[rgba(56,232,255,0.1)] px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--accent)] transition-colors hover:bg-[rgba(56,232,255,0.2)] disabled:opacity-50"
              >
                {submitting ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                {editingId ? 'Save' : 'Track'}
              </button>
            </div>
            {formError && <div className="text-[10px] text-[var(--critical)]">{formError}</div>}
          </div>
        )}

        {loadError && (
          <div className="mb-2 flex items-center justify-between gap-2 border border-[rgba(255,77,94,0.3)] bg-[rgba(255,77,94,0.06)] px-2.5 py-1.5">
            <span className="text-[10px] text-[var(--critical)]">{loadError}</span>
            <button
              type="button"
              onClick={refresh}
              className="rounded border border-[rgba(255,77,94,0.4)] px-2 py-0.5 text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--critical)]"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-4 text-xs text-[var(--text-mid)]">
            <Loader2 size={13} className="animate-spin text-[var(--accent)]" />
            Loading watchlist...
          </div>
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-[11px] text-[var(--text-lo)]">
            Nothing tracked yet. Add a ticker to keep an eye on it.
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="flex flex-1 items-center gap-1.5 border border-[var(--line)] bg-[var(--bg-raised)] px-2">
                <Search size={11} className="text-[var(--text-lo)]" />
                <input
                  type="text"
                  value={query}
                  placeholder="Filter by ticker or name"
                  onChange={e => setQuery(e.target.value)}
                  className="w-full bg-transparent py-1.5 text-[11px] text-[var(--text-hi)] outline-none placeholder:text-[var(--text-lo)]"
                />
              </div>
              <select
                value={typeFilter}
                aria-label="Filter by asset type"
                onChange={e => setTypeFilter(e.target.value)}
                className="border border-[var(--line)] bg-[var(--bg-raised)] px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-hi)] outline-none focus:border-[rgba(56,232,255,0.45)]"
              >
                <option value="all">All types</option>
                {WATCHLIST_ASSET_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <select
                value={`${sortKey}:${sortDir}`}
                aria-label="Sort watchlist"
                onChange={e => {
                  const [key, direction] = e.target.value.split(':') as [WatchlistSortKey, WatchlistSortDirection]
                  setSortKey(key)
                  setSortDir(direction)
                }}
                className="border border-[var(--line)] bg-[var(--bg-raised)] px-2 py-1.5 font-mono text-[10px] text-[var(--text-hi)] outline-none focus:border-[rgba(56,232,255,0.45)]"
              >
                {(Object.keys(SORT_LABELS) as WatchlistSortKey[]).flatMap(key => [
                  <option key={`${key}:asc`} value={`${key}:asc`}>
                    {SORT_LABELS[key]} ↑
                  </option>,
                  <option key={`${key}:desc`} value={`${key}:desc`}>
                    {SORT_LABELS[key]} ↓
                  </option>,
                ])}
              </select>
              <span className="text-[9px] font-mono text-[var(--text-lo)]">
                {liveCount}/{activeCount} live
              </span>
            </div>

            {visible.length === 0 ? (
              <p className="py-4 text-center text-[11px] text-[var(--text-lo)]">
                No watchlist entries match the current filter.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {visible.map(item => (
                  <WatchlistRow
                    key={item.id}
                    item={item}
                    busy={busyId === item.id}
                    expanded={expandedId === item.id}
                    sparkline={history[item.id]}
                    onToggleExpand={() => toggleExpanded(item)}
                    onTrade={action => onTradeRequest({ ticker: item.ticker, company_name: item.company_name, action })}
                    onEdit={() => openEditForm(item)}
                    onRemove={() => void handleRemove(item)}
                    onEvidence={() => setActivePanel({ id: item.id, kind: 'evidence' })}
                    onAlerts={() => setActivePanel({ id: item.id, kind: 'alerts' })}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </Panel>

      {activePanel?.kind === 'evidence' && (
        <WatchlistEvidencePanel
          itemId={activePanel.id}
          ticker={items.find(entry => entry.id === activePanel.id)?.ticker ?? ''}
          onClose={() => setActivePanel(null)}
        />
      )}
      {activePanel?.kind === 'alerts' && (
        <WatchlistAlertsPanel
          itemId={activePanel.id}
          ticker={items.find(entry => entry.id === activePanel.id)?.ticker ?? ''}
          onClose={() => setActivePanel(null)}
        />
      )}
    </div>
  )
}

interface WatchlistRowProps {
  item: WatchlistQuoteItem
  busy: boolean
  expanded: boolean
  sparkline: number[] | 'loading' | 'unavailable' | undefined
  onToggleExpand: () => void
  onTrade: (action: 'buy' | 'sell') => void
  onEdit: () => void
  onRemove: () => void
  onEvidence: () => void
  onAlerts: () => void
}

function WatchlistRow({
  item,
  busy,
  expanded,
  sparkline,
  onToggleExpand,
  onTrade,
  onEdit,
  onRemove,
  onEvidence,
  onAlerts,
}: WatchlistRowProps) {
  const market = item.market
  const live = hasLiveMarket(market)
  const tone = movementTone(market.change_percent)

  return (
    <li className="border border-[var(--line)] bg-[rgba(6,12,18,0.4)] px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[12px] font-semibold text-[var(--text-hi)]">{item.ticker}</span>
            <Badge tone="neutral">{item.asset_type.toUpperCase()}</Badge>
            {!live && market.status === 'unavailable' && <Badge tone="warning">NO PRICE</Badge>}
          </div>
          {item.company_name && (
            <div className="mt-0.5 truncate text-[9px] text-[var(--text-lo)]">{item.company_name}</div>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          title={`Remove ${item.ticker} from watchlist`}
          aria-label={`Remove ${item.ticker} from watchlist`}
          className="rounded border border-transparent p-1 text-[var(--text-lo)] transition-colors hover:border-[rgba(255,77,94,0.3)] hover:text-[var(--critical)] disabled:opacity-40"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <div className="text-[8px] font-mono uppercase tracking-[0.14em] text-[var(--text-lo)]">Price</div>
          <div className="font-mono text-[12px] text-[var(--text-hi)]">
            {live ? formatPrice(market.price, market.currency) : '—'}
          </div>
          {!live && <div className="text-[8px] font-mono text-[var(--text-lo)]">unavailable</div>}
        </div>
        <div>
          <div className="text-[8px] font-mono uppercase tracking-[0.14em] text-[var(--text-lo)]">Change</div>
          <div className="flex items-center gap-1 font-mono text-[12px]" style={{ color: tone }}>
            {live && market.change != null ? (
              market.change >= 0 ? (
                <ArrowUpRight size={11} />
              ) : (
                <ArrowDownRight size={11} />
              )
            ) : null}
            {live ? formatSigned(market.change) : '—'}
          </div>
          <div className="text-[8px] font-mono" style={{ color: tone }}>
            {live ? formatChangePercent(market.change_percent) : '—'}
          </div>
        </div>
        <div>
          <div className="text-[8px] font-mono uppercase tracking-[0.14em] text-[var(--text-lo)]">Prev close</div>
          <div className="font-mono text-[12px] text-[var(--text-mid)]">
            {live ? formatPrice(market.previous_close, market.currency) : '—'}
          </div>
        </div>
        <div>
          <div className="text-[8px] font-mono uppercase tracking-[0.14em] text-[var(--text-lo)]">Levels</div>
          <div className="flex flex-col gap-0.5 font-mono text-[9px]">
            {item.target_price != null && (
              <span className="text-[var(--positive)]">TARGET {formatCurrency(item.target_price, false)}</span>
            )}
            {item.stop_loss != null && (
              <span className="text-[var(--critical)]">STOP {formatCurrency(item.stop_loss, false)}</span>
            )}
            {item.target_price == null && item.stop_loss == null && (
              <span className="text-[var(--text-lo)]">—</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[8px] font-mono text-[var(--text-lo)]">
        <span>
          {live
            ? `Updated ${relativeTime(market.observed_at)} · ${market.provider ?? 'provider'}${market.currency ? ` · ${market.currency}` : ''}`
            : 'No provider-backed quote'}
        </span>
        {item.notes && <span className="truncate">NOTE · {item.notes}</span>}
      </div>

      {expanded && (
        <div className="mt-2 border-t border-[var(--line)] pt-2">
          {sparkline === 'loading' ? (
            <div className="flex items-center gap-2 text-[9px] font-mono text-[var(--text-lo)]">
              <Loader2 size={11} className="animate-spin" /> Loading history...
            </div>
          ) : Array.isArray(sparkline) && sparkline.length >= 2 ? (
            <div className="flex items-center gap-2">
              <Sparkline
                data={sparkline}
                stroke={tone === 'var(--positive)' ? 'var(--positive)' : tone === 'var(--critical)' ? 'var(--critical)' : 'var(--accent)'}
                width={160}
                height={32}
              />
              <span className="text-[8px] font-mono text-[var(--text-lo)]">provider-backed history</span>
            </div>
          ) : (
            <p className="text-[9px] font-mono text-[var(--text-lo)]">
              Historical price data unavailable for this symbol.
            </p>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onTrade('buy')}
          title={`Buy ${item.ticker}`}
          className="flex-1 rounded border border-[rgba(46,230,168,0.35)] px-2 py-1 text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--positive)] transition-colors hover:bg-[rgba(46,230,168,0.12)]"
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => onTrade('sell')}
          title={`Sell ${item.ticker}`}
          className="flex-1 rounded border border-[rgba(255,77,94,0.35)] px-2 py-1 text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--critical)] transition-colors hover:bg-[rgba(255,77,94,0.12)]"
        >
          Sell
        </button>
        <button
          type="button"
          onClick={onEdit}
          title={`Edit ${item.ticker}`}
          aria-label={`Edit ${item.ticker}`}
          className="rounded border border-[var(--line)] p-1.5 text-[var(--text-mid)] transition-colors hover:text-[var(--accent)]"
        >
          <Pencil size={11} />
        </button>
        <button
          type="button"
          onClick={onEvidence}
          title={`Geopolitical evidence for ${item.ticker}`}
          aria-label={`Geopolitical evidence for ${item.ticker}`}
          className="rounded border border-[var(--line)] p-1.5 text-[var(--text-mid)] transition-colors hover:text-[var(--accent)]"
        >
          <ShieldAlert size={11} />
        </button>
        <button
          type="button"
          onClick={onAlerts}
          title={`Alerts for ${item.ticker}`}
          aria-label={`Alerts for ${item.ticker}`}
          className="rounded border border-[var(--line)] p-1.5 text-[var(--text-mid)] transition-colors hover:text-[var(--accent)]"
        >
          <BellRing size={11} />
        </button>
        <button
          type="button"
          onClick={onToggleExpand}
          title={expanded ? 'Hide history' : 'Show history'}
          aria-label={expanded ? `Hide history for ${item.ticker}` : `Show history for ${item.ticker}`}
          className="rounded border border-[var(--line)] p-1.5 text-[var(--text-mid)] transition-colors hover:text-[var(--accent)]"
        >
          {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      </div>
    </li>
  )
}

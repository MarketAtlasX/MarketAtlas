import { useCallback, useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { ArrowDownRight, ArrowUpRight, Loader2, Plus, Trash2, X } from 'lucide-react'
import Panel from '../../components/ui/Panel'
import Badge from '../../components/ui/Badge'
import { addToWatchlist, getWatchlist, removeFromWatchlist } from '../../api/profileApi'
import type { WatchlistItem } from '../../types'
import type { TradeDraft } from './PortfolioHoldings'

const ASSET_TYPES = ['stock', 'etf', 'commodity', 'index', 'currency', 'bond'] as const

const EMPTY_FORM = {
  ticker: '',
  company_name: '',
  asset_type: 'stock',
  target_price: '',
  stop_loss: '',
  notes: '',
}

function money(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function apiError(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
    if (!error.response) return 'Cannot reach the MarketAtlas backend. Is it running?'
  }
  return fallback
}

interface WatchlistSectionProps {
  onTradeRequest: (draft: TradeDraft) => void
}

export default function WatchlistSection({ onTradeRequest }: WatchlistSectionProps) {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadWatchlist = useCallback(async () => {
    setLoadError(null)
    try {
      setItems(await getWatchlist())
    } catch (error) {
      setLoadError(apiError(error, 'Unable to load your watchlist.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadWatchlist()
  }, [loadWatchlist])

  const submit = async () => {
    const ticker = form.ticker.trim().toUpperCase()
    if (!ticker) {
      setFormError('Enter a ticker symbol.')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      await addToWatchlist({
        ticker,
        company_name: form.company_name.trim() || undefined,
        asset_type: form.asset_type,
        target_price: form.target_price ? Number(form.target_price) : undefined,
        stop_loss: form.stop_loss ? Number(form.stop_loss) : undefined,
        notes: form.notes.trim() || undefined,
      })
      setForm(EMPTY_FORM)
      setFormOpen(false)
      await loadWatchlist()
    } catch (error) {
      setFormError(apiError(error, 'Could not add the ticker to your watchlist.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemove = async (itemId: string) => {
    setBusyId(itemId)
    setLoadError(null)
    try {
      await removeFromWatchlist(itemId)
      await loadWatchlist()
    } catch (error) {
      setLoadError(apiError(error, 'Could not remove the ticker.'))
    } finally {
      setBusyId(null)
    }
  }

  const requestTrade = (item: WatchlistItem, action: 'buy' | 'sell') => {
    onTradeRequest({ ticker: item.ticker, company_name: item.company_name, action })
  }

  return (
    <Panel
      title={`WATCHLIST · ${items.length}`}
      corners
      right={
        <button
          type="button"
          onClick={() => {
            setFormOpen(open => !open)
            setFormError(null)
          }}
          aria-label={formOpen ? 'Close watchlist form' : 'Add ticker to watchlist'}
          className="rounded border border-[var(--line)] p-1.5 text-[var(--text-mid)] transition-colors hover:border-[rgba(56,232,255,0.35)] hover:text-[var(--accent)]"
        >
          {formOpen ? <X size={12} /> : <Plus size={12} />}
        </button>
      }
    >
      {formOpen && (
        <div className="mb-3 space-y-2 border border-[var(--line)] bg-[rgba(6,12,18,0.5)] p-3">
          <input
            type="text"
            value={form.ticker}
            maxLength={20}
            placeholder="Ticker (e.g. NVDA)"
            onChange={e => setForm(prev => ({ ...prev, ticker: e.target.value.toUpperCase() }))}
            className="w-full border border-[var(--line)] bg-[var(--bg-raised)] px-2 py-1.5 font-mono text-[11px] text-[var(--text-hi)] outline-none focus:border-[rgba(56,232,255,0.45)] placeholder:text-[var(--text-lo)]"
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
          <div className="flex items-center gap-2">
            <select
              value={form.asset_type}
              onChange={e => setForm(prev => ({ ...prev, asset_type: e.target.value }))}
              aria-label="Asset type"
              className="flex-1 border border-[var(--line)] bg-[var(--bg-raised)] px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-hi)] outline-none focus:border-[rgba(56,232,255,0.45)]"
            >
              {ASSET_TYPES.map(type => (
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
              Track
            </button>
          </div>
          {formError && <div className="text-[10px] text-[var(--critical)]">{formError}</div>}
        </div>
      )}

      {loadError && <div className="mb-2 text-[10px] text-[var(--critical)]">{loadError}</div>}

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
        <ul className="flex flex-col gap-2">
          {items.map(item => {
            const busy = busyId === item.id
            return (
              <li
                key={item.id}
                className="border border-[var(--line)] bg-[rgba(6,12,18,0.4)] px-3 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] font-semibold text-[var(--text-hi)]">
                        {item.ticker}
                      </span>
                      <Badge tone="neutral">{item.asset_type.toUpperCase()}</Badge>
                    </div>
                    {item.company_name && (
                      <div className="mt-0.5 truncate text-[9px] text-[var(--text-lo)]">
                        {item.company_name}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRemove(item.id)}
                    disabled={busy}
                    title={`Remove ${item.ticker} from watchlist`}
                    aria-label={`Remove ${item.ticker} from watchlist`}
                    className="rounded border border-transparent p-1 text-[var(--text-lo)] transition-colors hover:border-[rgba(255,77,94,0.3)] hover:text-[var(--critical)] disabled:opacity-40"
                  >
                    {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                </div>

                {(item.target_price != null || item.stop_loss != null) && (
                  <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[9px]">
                    {item.target_price != null && (
                      <span className="flex items-center gap-1 text-[var(--positive)]">
                        <ArrowUpRight size={10} />
                        TARGET {money(item.target_price)}
                      </span>
                    )}
                    {item.stop_loss != null && (
                      <span className="flex items-center gap-1 text-[var(--critical)]">
                        <ArrowDownRight size={10} />
                        STOP {money(item.stop_loss)}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => requestTrade(item, 'buy')}
                    title={`Buy ${item.ticker}`}
                    className="flex-1 rounded border border-[rgba(46,230,168,0.35)] px-2 py-1 text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--positive)] transition-colors hover:bg-[rgba(46,230,168,0.12)]"
                  >
                    Buy
                  </button>
                  <button
                    type="button"
                    onClick={() => requestTrade(item, 'sell')}
                    title={`Sell ${item.ticker}`}
                    className="flex-1 rounded border border-[rgba(255,77,94,0.35)] px-2 py-1 text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--critical)] transition-colors hover:bg-[rgba(255,77,94,0.12)]"
                  >
                    Sell
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

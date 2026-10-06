import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Loader2,
  Minus,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import Panel from '../../components/ui/Panel'
import Badge from '../../components/ui/Badge'
import { closeTrade, createTrade, deleteTrade, getTrades } from '../../api/profileApi'
import { formatCurrency, formatPercent, getPnLDirection, type Trade } from '../../types'

/** A buy/sell request raised elsewhere (e.g. from the watchlist). */
export interface TradeDraft {
  ticker: string
  company_name?: string
  action: 'buy' | 'sell'
}

type TradeType = 'intraday' | 'normal'
type Action = 'buy' | 'sell'
type TypeFilter = 'all' | TradeType
type StatusFilter = 'all' | 'open' | 'closed'

const EMPTY_FORM = {
  ticker: '',
  company_name: '',
  quantity: '',
  price_per_share: '',
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

function DirectionIcon({ value }: { value: number | undefined }) {
  const direction = getPnLDirection(value)
  if (direction === 'up') return <ArrowUpRight size={12} className="text-[var(--positive)]" />
  if (direction === 'down') return <ArrowDownRight size={12} className="text-[var(--critical)]" />
  return <Minus size={12} className="text-[var(--text-lo)]" />
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T
  options: { value: T; label: string; tone?: string }[]
  onChange: (next: T) => void
  ariaLabel: string
}) {
  return (
    <div className="flex overflow-hidden rounded border border-[var(--line)]" role="group" aria-label={ariaLabel}>
      {options.map(option => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-[0.12em] transition-colors ${
              active
                ? 'bg-[rgba(56,232,255,0.12)] text-[var(--accent)]'
                : 'text-[var(--text-mid)] hover:text-[var(--text-hi)]'
            }`}
            style={active && option.tone ? { color: option.tone } : undefined}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

interface PortfolioHoldingsProps {
  draft: TradeDraft | null
  onDraftConsumed: () => void
  onChanged: () => void
}

export default function PortfolioHoldings({ draft, onDraftConsumed, onChanged }: PortfolioHoldingsProps) {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const [formOpen, setFormOpen] = useState(false)
  const [action, setAction] = useState<Action>('buy')
  const [tradeType, setTradeType] = useState<TradeType>('normal')
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const tickerRef = useRef<HTMLInputElement>(null)

  const loadTrades = useCallback(async () => {
    setLoadError(null)
    try {
      const next = await getTrades()
      setTrades(next)
    } catch (error) {
      setLoadError(apiError(error, 'Unable to load your trades.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTrades()
  }, [loadTrades])

  // A buy/sell request from the watchlist pre-fills and opens the trade form.
  useEffect(() => {
    if (!draft) return
    setForm({ ...EMPTY_FORM, ticker: draft.ticker, company_name: draft.company_name ?? '' })
    setAction(draft.action)
    setFormError(null)
    setFormOpen(true)
    onDraftConsumed()
    window.setTimeout(() => tickerRef.current?.focus(), 50)
  }, [draft, onDraftConsumed])

  const quantity = Number(form.quantity)
  const price = Number(form.price_per_share)
  const total =
    Number.isFinite(quantity) && Number.isFinite(price) && quantity > 0 && price >= 0
      ? quantity * price
      : 0

  const filtered = useMemo(
    () =>
      trades.filter(trade => {
        if (typeFilter !== 'all' && trade.trade_type !== typeFilter) return false
        if (statusFilter !== 'all' && trade.status !== statusFilter) return false
        return true
      }),
    [trades, typeFilter, statusFilter],
  )

  const openCount = trades.filter(trade => trade.status === 'open').length
  const investedInView = filtered
    .filter(trade => trade.status === 'open')
    .reduce((sum, trade) => sum + trade.total_amount, 0)

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setAction('buy')
    setTradeType('normal')
    setFormError(null)
  }

  const submit = async () => {
    const ticker = form.ticker.trim().toUpperCase()
    if (!ticker) {
      setFormError('Enter a ticker symbol.')
      return
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setFormError('Quantity must be greater than zero.')
      return
    }
    if (!Number.isFinite(price) || price < 0) {
      setFormError('Price per share must be zero or greater.')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      await createTrade({
        ticker,
        company_name: form.company_name.trim() || undefined,
        trade_type: tradeType,
        action,
        quantity,
        price_per_share: price,
        total_amount: total,
        notes: form.notes.trim() || undefined,
      })
      setNotice(
        `${action === 'buy' ? 'Bought' : 'Sold'} ${quantity} ${ticker} @ ${money(price)} (${
          tradeType === 'intraday' ? 'intraday' : 'normal'
        })`,
      )
      resetForm()
      setFormOpen(false)
      await loadTrades()
      onChanged()
    } catch (error) {
      setFormError(apiError(error, 'Could not record the trade.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = async (tradeId: string) => {
    setBusyId(tradeId)
    setNotice(null)
    try {
      await closeTrade(tradeId)
      await loadTrades()
      onChanged()
    } catch (error) {
      setLoadError(apiError(error, 'Could not close the position.'))
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (tradeId: string) => {
    setBusyId(tradeId)
    setNotice(null)
    try {
      await deleteTrade(tradeId)
      await loadTrades()
      onChanged()
    } catch (error) {
      setLoadError(apiError(error, 'Could not remove the trade.'))
    } finally {
      setBusyId(null)
    }
  }

  const quickTrade = (trade: Trade, nextAction: Action) => {
    setForm({
      ticker: trade.ticker,
      company_name: trade.company_name ?? '',
      quantity: '',
      price_per_share: trade.current_price ? String(trade.current_price) : String(trade.price_per_share),
      notes: '',
    })
    setAction(nextAction)
    setTradeType(trade.trade_type)
    setFormError(null)
    setFormOpen(true)
    window.setTimeout(() => tickerRef.current?.focus(), 50)
  }

  return (
    <Panel
      title={`POSITIONS & TRADES · ${openCount} OPEN`}
      corners
      right={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <SegmentedControl
            ariaLabel="Filter by trade type"
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'normal', label: 'Normal' },
              { value: 'intraday', label: 'Intraday' },
            ]}
          />
          <SegmentedControl
            ariaLabel="Filter by status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'Any' },
              { value: 'open', label: 'Open' },
              { value: 'closed', label: 'Closed' },
            ]}
          />
          <button
            type="button"
            onClick={() => {
              if (formOpen) {
                setFormOpen(false)
                resetForm()
              } else {
                setFormOpen(true)
              }
            }}
            className="flex items-center gap-1.5 rounded border border-[rgba(56,232,255,0.35)] bg-[rgba(56,232,255,0.08)] px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--accent)] transition-colors hover:bg-[rgba(56,232,255,0.16)]"
          >
            {formOpen ? <X size={11} /> : <Plus size={11} />}
            {formOpen ? 'Cancel' : 'New trade'}
          </button>
        </div>
      }
    >
      {notice && (
        <div className="mb-3 flex items-center gap-2 border border-[rgba(46,230,168,0.3)] bg-[rgba(46,230,168,0.06)] px-2.5 py-1.5 text-[10px] font-mono text-[var(--positive)]">
          <Check size={11} />
          {notice}
        </div>
      )}

      {formOpen && (
        <div className="mb-4 border border-[var(--line)] bg-[rgba(6,12,18,0.5)] p-3">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <div className="mb-1 text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--text-lo)]">
                Trade type
              </div>
              <SegmentedControl
                ariaLabel="Trade type"
                value={tradeType}
                onChange={setTradeType}
                options={[
                  { value: 'normal', label: 'Normal (delivery)' },
                  { value: 'intraday', label: 'Intraday' },
                ]}
              />
            </div>
            <div>
              <div className="mb-1 text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--text-lo)]">
                Action
              </div>
              <SegmentedControl
                ariaLabel="Trade action"
                value={action}
                onChange={setAction}
                options={[
                  { value: 'buy', label: 'Buy', tone: 'var(--positive)' },
                  { value: 'sell', label: 'Sell', tone: 'var(--critical)' },
                ]}
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--text-lo)]">
                Ticker
              </span>
              <input
                ref={tickerRef}
                type="text"
                value={form.ticker}
                maxLength={20}
                placeholder="NVDA"
                onChange={e => setForm(prev => ({ ...prev, ticker: e.target.value.toUpperCase() }))}
                className="border border-[var(--line)] bg-[var(--bg-raised)] px-2 py-1.5 font-mono text-[11px] text-[var(--text-hi)] outline-none focus:border-[rgba(56,232,255,0.45)] placeholder:text-[var(--text-lo)]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--text-lo)]">
                Company (optional)
              </span>
              <input
                type="text"
                value={form.company_name}
                maxLength={255}
                placeholder="NVIDIA Corp"
                onChange={e => setForm(prev => ({ ...prev, company_name: e.target.value }))}
                className="border border-[var(--line)] bg-[var(--bg-raised)] px-2 py-1.5 text-[11px] text-[var(--text-hi)] outline-none focus:border-[rgba(56,232,255,0.45)] placeholder:text-[var(--text-lo)]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--text-lo)]">
                Quantity
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={form.quantity}
                placeholder="0"
                onChange={e => setForm(prev => ({ ...prev, quantity: e.target.value }))}
                className="border border-[var(--line)] bg-[var(--bg-raised)] px-2 py-1.5 font-mono text-[11px] text-[var(--text-hi)] outline-none focus:border-[rgba(56,232,255,0.45)] placeholder:text-[var(--text-lo)]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--text-lo)]">
                Price / share
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={form.price_per_share}
                placeholder="0.00"
                onChange={e => setForm(prev => ({ ...prev, price_per_share: e.target.value }))}
                className="border border-[var(--line)] bg-[var(--bg-raised)] px-2 py-1.5 font-mono text-[11px] text-[var(--text-hi)] outline-none focus:border-[rgba(56,232,255,0.45)] placeholder:text-[var(--text-lo)]"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-[9px] uppercase tracking-[0.14em] text-[var(--text-lo)]">Amount</span>
              <span className="font-semibold" style={{ color: action === 'buy' ? 'var(--positive)' : 'var(--critical)' }}>
                {money(total)}
              </span>
              <span className="text-[9px] text-[var(--text-lo)]">
                {tradeType === 'intraday' ? '· INTRADAY' : '· NORMAL / DELIVERY'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={submitting}
              className="flex items-center gap-1.5 rounded border border-[rgba(56,232,255,0.4)] bg-[rgba(56,232,255,0.1)] px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--accent)] transition-colors hover:bg-[rgba(56,232,255,0.2)] disabled:opacity-50"
            >
              {submitting ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
              Record {action}
            </button>
          </div>

          {formError && <div className="mt-2 text-[10px] text-[var(--critical)]">{formError}</div>}
        </div>
      )}

      {loadError && <div className="mb-3 text-[10px] text-[var(--critical)]">{loadError}</div>}

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-xs text-[var(--text-mid)]">
          <Loader2 size={13} className="animate-spin text-[var(--accent)]" />
          Loading positions...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-6 text-center text-[11px] text-[var(--text-lo)]">
          {trades.length === 0
            ? 'No trades recorded yet. Use “New trade” to add your first position.'
            : 'No trades match the selected filters.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-[var(--line)] text-left font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--text-lo)]">
                <th className="py-2 pr-3 font-medium">Stock</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 font-medium">Qty × Price</th>
                <th className="py-2 pr-3 text-right font-medium">Invested</th>
                <th className="py-2 pr-3 text-right font-medium">Value</th>
                <th className="py-2 pr-3 text-right font-medium">P&amp;L</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(trade => {
                const direction = getPnLDirection(trade.profit_loss)
                const tone =
                  direction === 'up'
                    ? 'var(--positive)'
                    : direction === 'down'
                      ? 'var(--critical)'
                      : 'var(--text-mid)'
                const busy = busyId === trade.id
                return (
                  <tr key={trade.id} className="border-b border-[rgba(58,78,96,0.35)] last:border-b-0">
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-[var(--text-hi)]">{trade.ticker}</span>
                        <Badge tone={trade.action === 'buy' ? 'positive' : 'critical'}>
                          {trade.action.toUpperCase()}
                        </Badge>
                      </div>
                      {trade.company_name && (
                        <div className="mt-0.5 max-w-[180px] truncate text-[9px] text-[var(--text-lo)]">
                          {trade.company_name}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`font-mono text-[9px] uppercase tracking-[0.12em] ${
                          trade.trade_type === 'intraday' ? 'text-[var(--warning)]' : 'text-[var(--text-mid)]'
                        }`}
                      >
                        {trade.trade_type}
                      </span>
                    </td>
                    <td className="py-2 pr-3 font-mono text-[var(--text-mid)]">
                      {trade.quantity} × {money(trade.price_per_share)}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-[var(--text-hi)]">
                      {money(trade.total_amount)}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-[var(--text-hi)]">
                      {trade.current_value == null ? '—' : money(trade.current_value)}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono" style={{ color: tone }}>
                      <span className="inline-flex items-center justify-end gap-1">
                        <DirectionIcon value={trade.profit_loss} />
                        {trade.profit_loss == null ? '—' : formatCurrency(trade.profit_loss)}
                        {trade.profit_loss_percent != null && (
                          <span className="text-[9px] text-[var(--text-lo)]">
                            ({formatPercent(trade.profit_loss_percent)})
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <Badge tone={trade.status === 'open' ? 'accent' : trade.status === 'closed' ? 'neutral' : 'warning'}>
                        {trade.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => quickTrade(trade, 'buy')}
                          disabled={busy}
                          title={`Buy more ${trade.ticker}`}
                          className="rounded border border-[rgba(46,230,168,0.35)] px-2 py-1 text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--positive)] transition-colors hover:bg-[rgba(46,230,168,0.12)] disabled:opacity-40"
                        >
                          Buy
                        </button>
                        <button
                          type="button"
                          onClick={() => quickTrade(trade, 'sell')}
                          disabled={busy}
                          title={`Sell ${trade.ticker}`}
                          className="rounded border border-[rgba(255,77,94,0.35)] px-2 py-1 text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--critical)] transition-colors hover:bg-[rgba(255,77,94,0.12)] disabled:opacity-40"
                        >
                          Sell
                        </button>
                        {trade.status === 'open' && (
                          <button
                            type="button"
                            onClick={() => void handleClose(trade.id)}
                            disabled={busy}
                            title="Close position"
                            className="rounded border border-[var(--line)] px-2 py-1 text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--text-mid)] transition-colors hover:text-[var(--text-hi)] disabled:opacity-40"
                          >
                            Close
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleDelete(trade.id)}
                          disabled={busy}
                          title="Remove trade"
                          aria-label={`Remove ${trade.ticker} trade`}
                          className="rounded border border-transparent p-1 text-[var(--text-lo)] transition-colors hover:border-[rgba(255,77,94,0.3)] hover:text-[var(--critical)] disabled:opacity-40"
                        >
                          {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="mt-3 flex items-center justify-between border-t border-[var(--line)] pt-2 text-[9px] font-mono text-[var(--text-lo)]">
          <span>
            {filtered.length} of {trades.length} trades shown
          </span>
          <span>INVESTED IN VIEW · {money(investedInView)}</span>
        </div>
      )}
    </Panel>
  )
}

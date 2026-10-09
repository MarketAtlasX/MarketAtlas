import { useCallback, useEffect, useMemo, useState } from 'react'
import { BellRing, Loader2, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import Panel from '../../components/ui/Panel'
import Badge from '../../components/ui/Badge'
import {
  createAlertRule,
  deleteAlertRule,
  evaluateAlerts,
  getAlertEvents,
  getAlertRules,
  getAlertSchedulerHealth,
  markAlertEventRead,
  markAllAlertEventsRead,
  updateAlertRule,
} from '../../api/profileApi'
import type {
  WatchlistAlertEvent,
  WatchlistAlertKind,
  WatchlistAlertRule,
  WatchlistAlertSchedulerHealth,
} from '../../types'
import { apiError, relativeTime } from './watchlistUtils'

const KIND_OPTIONS: { value: WatchlistAlertKind; label: string }[] = [
  { value: 'target_price', label: 'Target price' },
  { value: 'stop_loss', label: 'Stop loss' },
  { value: 'percent_move', label: 'Percent move' },
  { value: 'event_severity', label: 'Event severity' },
]

const EMPTY_FORM = {
  kind: 'percent_move' as WatchlistAlertKind,
  amount: '',
  direction: '' as '' | 'above' | 'below',
  cooldown: '900',
}

interface WatchlistAlertsPanelProps {
  itemId: string
  ticker: string
  onClose: () => void
}

export default function WatchlistAlertsPanel({ itemId, ticker, onClose }: WatchlistAlertsPanelProps) {
  const [rules, setRules] = useState<WatchlistAlertRule[]>([])
  const [events, setEvents] = useState<WatchlistAlertEvent[]>([])
  const [scheduler, setScheduler] = useState<WatchlistAlertSchedulerHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [evaluating, setEvaluating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [nextRules, nextEvents] = await Promise.all([getAlertRules(), getAlertEvents(50)])
      setRules(nextRules.filter(rule => rule.watchlist_id === itemId))
      setEvents(nextEvents.filter(event => event.watchlist_id === itemId).slice(0, 10))
    } catch (err) {
      setError(apiError(err, 'Unable to load alert rules.'))
    } finally {
      setLoading(false)
    }
    // Scheduler health is supplementary; never block the panel on it.
    try {
      setScheduler(await getAlertSchedulerHealth())
    } catch {
      setScheduler(null)
    }
  }, [itemId])

  useEffect(() => {
    void load()
  }, [load])

  const submit = async () => {
    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Enter a positive threshold value.')
      return
    }
    if (form.kind === 'percent_move' && amount > 100) {
      setFormError('Percentage threshold must be 100 or less.')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      await createAlertRule({
        watchlist_id: itemId,
        kind: form.kind,
        threshold: form.kind === 'percent_move' ? undefined : amount,
        percent_threshold: form.kind === 'percent_move' ? amount : undefined,
        direction: form.direction || undefined,
        cooldown_seconds: Number(form.cooldown) || 900,
      })
      setForm(EMPTY_FORM)
      setNotice('Alert rule saved.')
      await load()
    } catch (err) {
      setFormError(apiError(err, 'Could not save the alert rule.'))
    } finally {
      setSubmitting(false)
    }
  }

  const toggleRule = async (rule: WatchlistAlertRule) => {
    setBusyId(rule.id)
    setNotice(null)
    try {
      await updateAlertRule(rule.id, { is_active: !rule.is_active })
      await load()
    } catch (err) {
      setError(apiError(err, 'Could not update the alert rule.'))
    } finally {
      setBusyId(null)
    }
  }

  const removeRule = async (rule: WatchlistAlertRule) => {
    setBusyId(rule.id)
    setNotice(null)
    try {
      await deleteAlertRule(rule.id)
      await load()
    } catch (err) {
      setError(apiError(err, 'Could not delete the alert rule.'))
    } finally {
      setBusyId(null)
    }
  }

  const markRead = async (event: WatchlistAlertEvent) => {
    if (event.is_read) return
    try {
      await markAlertEventRead(event.id)
      setEvents(prev => prev.map(item => (item.id === event.id ? { ...item, is_read: true } : item)))
    } catch (err) {
      setError(apiError(err, 'Could not mark the alert as read.'))
    }
  }

  const markAllRead = async () => {
    try {
      await markAllAlertEventsRead()
      setEvents(prev => prev.map(item => ({ ...item, is_read: true })))
    } catch (err) {
      setError(apiError(err, 'Could not mark alerts as read.'))
    }
  }

  const runCheck = async () => {
    setEvaluating(true)
    setNotice(null)
    try {
      const result = await evaluateAlerts()
      const fired = result.triggered.filter(event => event.watchlist_id === itemId)
      setNotice(
        fired.length > 0
          ? `${fired.length} alert${fired.length === 1 ? '' : 's'} triggered for ${ticker}.`
          : `No new ${ticker} alert conditions met (checked ${result.evaluated_rules} rule${result.evaluated_rules === 1 ? '' : 's'} across your watchlist).`,
      )
      await load()
    } catch (err) {
      setError(apiError(err, 'Could not evaluate alerts.'))
    } finally {
      setEvaluating(false)
    }
  }

  const summary = useMemo(
    () => `${rules.filter(rule => rule.is_active).length} active · ${rules.length} total`,
    [rules],
  )
  const unreadCount = events.filter(event => !event.is_read).length

  return (
    <Panel
      title={`ALERTS · ${ticker}`}
      corners
      right={
        <button
          type="button"
          onClick={onClose}
          title="Close alerts"
          aria-label="Close alerts"
          className="rounded border border-[var(--line)] p-1.5 text-[var(--text-lo)] transition-colors hover:text-[var(--text-hi)]"
        >
          <X size={12} />
        </button>
      }
    >
      {loading ? (
        <div className="flex items-center gap-2 py-4 text-xs text-[var(--text-mid)]">
          <Loader2 size={13} className="animate-spin text-[var(--accent)]" />
          Loading alerts...
        </div>
      ) : (
        <div className="space-y-3">
          {notice && (
            <div className="border border-[rgba(56,232,255,0.3)] bg-[rgba(56,232,255,0.06)] px-2.5 py-1.5 text-[10px] font-mono text-[var(--accent)]">
              {notice}
            </div>
          )}
          {error && <div className="text-[10px] text-[var(--critical)]">{error}</div>}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--text-lo)]">
              {summary}
            </span>
            <button
              type="button"
              onClick={() => void runCheck()}
              disabled={evaluating}
              className="flex items-center gap-1.5 rounded border border-[rgba(56,232,255,0.35)] px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--accent)] transition-colors hover:bg-[rgba(56,232,255,0.12)] disabled:opacity-50"
            >
              {evaluating ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
              Run check
            </button>
          </div>

          {rules.length === 0 ? (
            <p className="text-[10px] text-[var(--text-lo)]">No alert rules configured for {ticker}.</p>
          ) : (
            <ul className="space-y-1.5">
              {rules.map(rule => (
                <li
                  key={rule.id}
                  className="flex items-center justify-between gap-2 border border-[var(--line)] bg-[rgba(6,12,18,0.4)] px-2.5 py-1.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <BellRing size={11} className="text-[var(--accent)]" />
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-hi)]">
                        {rule.kind.replace(/_/g, ' ')}
                        {rule.kind === 'percent_move'
                          ? ` ${rule.percent_threshold}%`
                          : rule.threshold != null
                            ? ` ${rule.threshold}`
                            : ''}
                      </span>
                      <Badge tone={rule.is_active ? 'positive' : 'neutral'}>
                        {rule.is_active ? 'ACTIVE' : 'PAUSED'}
                      </Badge>
                    </div>
                    {rule.last_triggered_at && (
                      <div className="mt-0.5 text-[9px] font-mono text-[var(--text-lo)]">
                        last fired {relativeTime(rule.last_triggered_at)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void toggleRule(rule)}
                      disabled={busyId === rule.id}
                      className="rounded border border-[var(--line)] px-2 py-1 text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--text-mid)] transition-colors hover:text-[var(--text-hi)] disabled:opacity-40"
                    >
                      {rule.is_active ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeRule(rule)}
                      disabled={busyId === rule.id}
                      title={`Delete ${rule.kind} rule`}
                      aria-label={`Delete ${rule.kind} rule`}
                      className="rounded border border-transparent p-1 text-[var(--text-lo)] transition-colors hover:border-[rgba(255,77,94,0.3)] hover:text-[var(--critical)] disabled:opacity-40"
                    >
                      {busyId === rule.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {events.length > 0 && (
            <section className="border-t border-[var(--line)] pt-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <h4 className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--text-lo)]">
                  Recently triggered{unreadCount > 0 ? ` · ${unreadCount} UNREAD` : ''}
                </h4>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => void markAllRead()}
                    className="rounded border border-[var(--line)] px-2 py-0.5 text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--text-mid)] hover:text-[var(--accent)]"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <ul className="space-y-1">
                {events.map(event => (
                  <li key={event.id} className="flex items-start justify-between gap-2 text-[10px] text-[var(--text-mid)]">
                    <span className="min-w-0">
                      {!event.is_read && (
                        <span
                          data-testid={`unread-${event.id}`}
                          className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)] align-middle"
                          aria-label="unread"
                        />
                      )}
                      <span className="font-mono text-[var(--text-hi)]">{relativeTime(event.triggered_at)}</span>
                      {' · '}
                      {event.message}
                    </span>
                    {!event.is_read && (
                      <button
                        type="button"
                        onClick={() => void markRead(event)}
                        aria-label={`Mark ${event.ticker} alert read`}
                        className="shrink-0 rounded border border-[var(--line)] px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--text-lo)] hover:text-[var(--accent)]"
                      >
                        Read
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="border-t border-[var(--line)] pt-2">
            <h4 className="mb-1 text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--text-lo)]">
              Scheduler
            </h4>
            {scheduler ? (
              <div className="space-y-0.5 text-[9px] font-mono text-[var(--text-lo)]">
                <div>
                  every {scheduler.schedule_minutes}m ·{' '}
                  {scheduler.is_running ? 'run in progress' : 'idle'}
                </div>
                <div>
                  last success:{' '}
                  {scheduler.last_success_at ? relativeTime(scheduler.last_success_at) : 'none yet'}
                </div>
                {scheduler.failures_last_24h > 0 && (
                  <div className="text-[var(--warning)]">
                    {scheduler.failures_last_24h} failure(s) in the last 24h
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[9px] font-mono text-[var(--text-lo)]">
                Scheduler status unavailable. Scheduled evaluation requires Celery worker + beat.
              </div>
            )}
          </section>

          <section className="border-t border-[var(--line)] pt-2">
            <h4 className="mb-2 text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--text-lo)]">
              New rule
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={form.kind}
                aria-label="Alert kind"
                onChange={e => setForm(prev => ({ ...prev, kind: e.target.value as WatchlistAlertKind }))}
                className="border border-[var(--line)] bg-[var(--bg-raised)] px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-hi)] outline-none focus:border-[rgba(56,232,255,0.45)]"
              >
                {KIND_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                step="any"
                value={form.amount}
                placeholder={form.kind === 'percent_move' ? 'Percent (e.g. 5)' : 'Threshold price'}
                onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                className="border border-[var(--line)] bg-[var(--bg-raised)] px-2 py-1.5 font-mono text-[10px] text-[var(--text-hi)] outline-none focus:border-[rgba(56,232,255,0.45)] placeholder:text-[var(--text-lo)]"
              />
              <select
                value={form.direction}
                aria-label="Alert direction"
                onChange={e => setForm(prev => ({ ...prev, direction: e.target.value as '' | 'above' | 'below' }))}
                className="border border-[var(--line)] bg-[var(--bg-raised)] px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-hi)] outline-none focus:border-[rgba(56,232,255,0.45)]"
              >
                <option value="">Either direction</option>
                <option value="above">Above</option>
                <option value="below">Below</option>
              </select>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={submitting}
                className="flex items-center justify-center gap-1.5 rounded border border-[rgba(56,232,255,0.4)] bg-[rgba(56,232,255,0.1)] px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--accent)] transition-colors hover:bg-[rgba(56,232,255,0.2)] disabled:opacity-50"
              >
                {submitting ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                Add rule
              </button>
            </div>
            {formError && <div className="mt-2 text-[10px] text-[var(--critical)]">{formError}</div>}
            <p className="mt-2 text-[9px] font-mono text-[var(--text-lo)]">
              Alerts evaluate against provider-backed prices. If a quote is unavailable, the rule is
              skipped rather than assumed.
            </p>
          </section>
        </div>
      )}
    </Panel>
  )
}

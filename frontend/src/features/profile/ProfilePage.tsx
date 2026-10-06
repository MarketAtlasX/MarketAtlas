import { useCallback, useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { Check, Landmark, Loader2, Pencil, RefreshCw, User as UserIcon, X } from 'lucide-react'
import Panel from '../../components/ui/Panel'
import Badge from '../../components/ui/Badge'
import { getPortfolioSummary, getProfile, updateProfile } from '../../api/profileApi'
import {
  formatCurrency,
  formatPercent,
  getPnLDirection,
  type PortfolioSummary,
  type Profile,
} from '../../types'
import PortfolioHoldings, { type TradeDraft } from './PortfolioHoldings'
import WatchlistSection from './WatchlistSection'

type LoadState = 'loading' | 'ready' | 'error'

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
    if (!error.response) return 'Cannot reach the MarketAtlas backend. Is it running?'
  }
  return fallback
}

function StatCard({
  label,
  value,
  tone = 'var(--text-hi)',
  hint,
}: {
  label: string
  value: string
  tone?: string
  hint?: string
}) {
  return (
    <div className="bg-[var(--bg-raised)] px-4 py-3">
      <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--text-lo)]">{label}</div>
      <div className="mt-1 text-sm font-semibold font-mono" style={{ color: tone }}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[9px] font-mono text-[var(--text-lo)]">{hint}</div>}
    </div>
  )
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  // A buy/sell request raised from the watchlist, handed to the holdings panel.
  const [draft, setDraft] = useState<TradeDraft | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [nextProfile, nextSummary] = await Promise.all([getProfile(), getPortfolioSummary()])
      setProfile(nextProfile)
      setSummary(nextSummary)
      setState('ready')
    } catch (err) {
      setError(errorMessage(err, 'Unable to load your profile.'))
      setState('error')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, reloadToken])

  const refresh = useCallback(() => setReloadToken(token => token + 1), [])
  const clearDraft = useCallback(() => setDraft(null), [])

  const startRename = () => {
    setNameDraft(profile?.display_name ?? '')
    setNameError(null)
    setEditingName(true)
  }

  const saveName = async () => {
    const next = nameDraft.trim()
    if (!next) {
      setNameError('Display name cannot be empty.')
      return
    }
    setSavingName(true)
    setNameError(null)
    try {
      const updated = await updateProfile(next)
      setProfile(updated)
      setEditingName(false)
    } catch (err) {
      setNameError(errorMessage(err, 'Could not save your display name.'))
    } finally {
      setSavingName(false)
    }
  }

  const pnl = summary?.total_profit_loss ?? 0
  const direction = getPnLDirection(pnl)
  const pnlTone =
    direction === 'up' ? 'var(--positive)' : direction === 'down' ? 'var(--critical)' : 'var(--text-mid)'

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto bg-command p-5">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <UserIcon size={14} className="text-[var(--accent)]" />
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--accent)]">
              Account
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-hi)]">Profile</h1>
          <p className="mt-1 text-[11px] text-[var(--text-mid)]">
            Your capital, positions and watchlist in one place
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="flex items-center gap-1.5 rounded border border-[var(--line)] bg-[rgba(6,12,18,0.72)] px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--text-mid)] transition-colors hover:border-[rgba(56,232,255,0.3)] hover:text-[var(--accent)]"
          title="Reload profile data"
        >
          <RefreshCw size={12} className={state === 'loading' ? 'animate-spin' : undefined} />
          Refresh
        </button>
      </div>

      {state === 'loading' && (
        <div className="flex items-center gap-2 py-10 text-xs text-[var(--text-mid)]">
          <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
          Loading your account...
        </div>
      )}

      {state === 'error' && (
        <Panel title="ACCOUNT UNAVAILABLE" glow="critical">
          <p className="text-xs text-[var(--critical)]">{error}</p>
          <p className="mt-2 text-[10px] text-[var(--text-lo)]">
            The profile service could not be reached. Verify the backend is running and that the
            latest database migration has been applied.
          </p>
        </Panel>
      )}

      {state === 'ready' && (
        <>
          <div className="grid grid-cols-2 gap-px border border-[var(--line)] bg-[var(--line)] lg:grid-cols-4">
            <StatCard
              label="Money invested"
              value={formatCurrency(summary?.total_invested ?? 0, false)}
              hint={`${summary?.open_trades_count ?? 0} open position${(summary?.open_trades_count ?? 0) === 1 ? '' : 's'}`}
            />
            <StatCard
              label="Current value"
              value={formatCurrency(summary?.total_value ?? 0, false)}
              tone="var(--accent)"
            />
            <StatCard
              label="Profit / loss"
              value={formatCurrency(pnl)}
              tone={pnlTone}
              hint={
                direction === 'neutral'
                  ? 'No movement yet'
                  : `${formatPercent(summary?.total_profit_loss_percent ?? 0)} vs invested`
              }
            />
            <StatCard
              label="Withdrawable"
              value={formatCurrency(summary?.withdrawable_balance ?? 0, false)}
              tone="var(--positive)"
              hint="Realised gains available"
            />
          </div>

          <Panel title="ACCOUNT DETAILS" corners>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(56,232,255,0.12)] text-lg font-bold text-[var(--accent)]">
                  {(profile?.display_name?.trim()?.[0] ?? 'A').toUpperCase()}
                </span>
                <div>
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={nameDraft}
                        maxLength={100}
                        autoFocus
                        onChange={e => setNameDraft(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') void saveName()
                          if (e.key === 'Escape') setEditingName(false)
                        }}
                        className="border border-[rgba(56,232,255,0.4)] bg-[var(--bg-raised)] px-2 py-1 text-sm text-[var(--text-hi)] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => void saveName()}
                        disabled={savingName}
                        title="Save display name"
                        aria-label="Save display name"
                        className="rounded border border-[rgba(46,230,168,0.35)] p-1.5 text-[var(--positive)] transition-colors hover:bg-[rgba(46,230,168,0.1)] disabled:opacity-50"
                      >
                        {savingName ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingName(false)}
                        title="Cancel"
                        aria-label="Cancel rename"
                        className="rounded border border-[var(--line)] p-1.5 text-[var(--text-lo)] transition-colors hover:text-[var(--text-hi)]"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-[var(--text-hi)]">
                        {profile?.display_name ?? 'Operator'}
                      </span>
                      <button
                        type="button"
                        onClick={startRename}
                        title="Edit display name"
                        aria-label="Edit display name"
                        className="rounded border border-transparent p-1 text-[var(--text-lo)] transition-colors hover:border-[rgba(56,232,255,0.3)] hover:text-[var(--accent)]"
                      >
                        <Pencil size={11} />
                      </button>
                    </div>
                  )}
                  <div className="mt-0.5 text-[11px] font-mono text-[var(--text-mid)]">
                    {profile?.email ?? 'UNKNOWN'}
                  </div>
                  {nameError && <div className="mt-1 text-[10px] text-[var(--critical)]">{nameError}</div>}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-mono">
                <div>
                  <div className="uppercase tracking-[0.14em] text-[var(--text-lo)]">Member since</div>
                  <div className="mt-0.5 text-[var(--text-hi)]">
                    {profile
                      ? new Date(profile.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '—'}
                  </div>
                </div>
                <div>
                  <div className="uppercase tracking-[0.14em] text-[var(--text-lo)]">Money earned</div>
                  <div className="mt-0.5 text-[var(--positive)]">
                    {formatCurrency(summary?.total_earned ?? 0, false)}
                  </div>
                </div>
                <div>
                  <div className="uppercase tracking-[0.14em] text-[var(--text-lo)]">Realised P&amp;L</div>
                  <div
                    className="mt-0.5"
                    style={{
                      color:
                        getPnLDirection(summary?.realised_profit_loss) === 'up'
                          ? 'var(--positive)'
                          : getPnLDirection(summary?.realised_profit_loss) === 'down'
                            ? 'var(--critical)'
                            : 'var(--text-hi)',
                    }}
                  >
                    {formatCurrency(summary?.realised_profit_loss ?? 0)}
                  </div>
                </div>
                <div>
                  <div className="uppercase tracking-[0.14em] text-[var(--text-lo)]">Closed positions</div>
                  <div className="mt-0.5 text-[var(--text-hi)]">{summary?.closed_trades_count ?? 0}</div>
                </div>
                <div>
                  <div className="uppercase tracking-[0.14em] text-[var(--text-lo)]">Status</div>
                  <div className="mt-0.5">
                    {profile?.is_active ? (
                      <Badge tone="positive">
                        <Check size={10} /> ACTIVE
                      </Badge>
                    ) : (
                      <Badge tone="warning">INACTIVE</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <PortfolioHoldings draft={draft} onDraftConsumed={clearDraft} onChanged={refresh} />
            </div>
            <div className="flex flex-col gap-4">
              <WatchlistSection onTradeRequest={setDraft} />
            </div>
          </div>

          <div className="flex items-center gap-2 px-1 pb-2 text-[9px] font-mono text-[var(--text-lo)]">
            <Landmark size={11} />
            BALANCES ARE DERIVED FROM YOUR RECORDED TRADES — VALUES UPDATE AS POSITIONS CHANGE
          </div>
        </>
      )}
    </div>
  )
}

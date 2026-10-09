export type LiveEventType = 'conflict' | 'election' | 'sanction' | 'trade' | 'diplomatic' | 'military' | 'economic' | 'natural' | 'market'

/**
 * Where an event entered the store, so the UI can distinguish genuinely live
 * backend events from the seeded/simulated demo data without a second store.
 */
export type LiveEventProvenance = 'live' | 'simulated'

export interface LiveEvent {
  id: string
  title: string
  countryCode: string
  country: string
  type: LiveEventType
  severity: number
  /** Backend-provided coordinates, or `null` when the source omitted them. */
  lat: number | null
  lng: number | null
  timestamp: string
  summary: string
  sectors: string[]
  /** 'live' for backend-ingested events; absent/'simulated' for seed data. */
  provenance?: LiveEventProvenance
  /**
   * Backend lifecycle status when the provider supplies one (e.g. 'breaking',
   * 'updated', 'resolved'). Never inferred — copied from the backend payload.
   */
  status?: string
}

export interface MarketSignal {
  symbol: string
  name: string
  price: number
  changePct: number
  direction: 'UP' | 'DOWN'
  confidence: number
  context: string
}

export interface RiskUpdate {
  entity: string
  risk: number
  timestamp: string
}

export interface GraphLink {
  source: string
  target: string
  influence: number
  label?: string
}

export interface AgentStatus {
  name: string
  state: 'active' | 'analyzing' | 'insight'
  consensus: number | null
  lastInsight?: string
}

export interface WorldRisk {
  score: number
  level: 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL'
  drivers: { entity: string; score: number }[]
}

export interface WorldStoreState {
  events: LiveEvent[]
  signals: MarketSignal[]
  riskUpdates: RiskUpdate[]
  graphLinks: GraphLink[]
  agents: AgentStatus[]
  worldRisk: WorldRisk
  selectedEntity: string | null
  dataMode: 'live' | 'delayed' | 'cached' | 'historical' | 'simulated' | 'degraded'
  updatedAt: string | null
  forecast: { symbol: string; bullish: number; base: number; bearish: number; confidence: number }
}

// User & Portfolio types
export interface Trade {
  id: string
  user_id: number
  ticker: string
  company_name?: string
  trade_type: 'intraday' | 'normal'
  action: 'buy' | 'sell'
  quantity: number
  price_per_share: number
  total_amount: number
  current_price?: number
  current_value?: number
  profit_loss?: number
  profit_loss_percent?: number
  status: 'open' | 'closed' | 'pending'
  notes?: string
  created_at: string
  updated_at: string
}

export interface WatchlistItem {
  id: string
  user_id: number
  ticker: string
  company_name?: string
  asset_type: string
  target_price?: number
  stop_loss?: number
  current_price?: number
  price_change?: number
  price_change_percent?: number
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// ── Watchlist intelligence ────────────────────────────────────────────────

/** Provider-backed market envelope for one watched asset. Absence means unknown. */
export interface WatchlistMarketQuote {
  status: 'provider-backed' | 'cached' | 'unavailable'
  symbol: string
  price?: number | null
  change?: number | null
  change_percent?: number | null
  previous_close?: number | null
  currency?: string | null
  provider?: string | null
  observed_at?: string | null
  freshness: string
  limitations: string[]
}

export interface WatchlistQuoteItem extends WatchlistItem {
  market: WatchlistMarketQuote
}

export interface WatchlistHistory {
  status: 'provider-backed' | 'unavailable'
  symbol: string
  interval: string
  provider?: string | null
  freshness: string
  points: { date: string; close: number }[]
  limitations: string[]
}

export interface WatchlistEvidenceEntity {
  id: number
  name: string
  entity_type: string
  country_code?: string | null
  latitude?: number | null
  longitude?: number | null
}

export interface WatchlistEvidenceEvent {
  id: number
  title: string
  event_type: string
  severity: string
  status: string
  event_date: string
  source?: string | null
  source_url?: string | null
  association: 'recorded_entity_link'
}

export interface WatchlistEvidenceLiveEvent {
  id: string
  title: string
  event_type: string
  severity: number
  status: string
  first_seen_at: string
  country_code?: string | null
  region?: string | null
  lat?: number | null
  lng?: number | null
  impacts: Array<Record<string, unknown>>
  affected_assets: Array<Record<string, unknown>>
  association: 'ticker_keyword_match'
}

export interface WatchlistGeography {
  label: string
  latitude?: number | null
  longitude?: number | null
  country_code?: string | null
  region?: string | null
  source: 'entity' | 'live_event'
}

export interface WatchlistEvidence {
  ticker: string
  asset_type: string
  association_reliability: 'recorded' | 'candidate' | 'none'
  association_methods: string[]
  entity?: WatchlistEvidenceEntity | null
  geography?: WatchlistGeography | null
  events: WatchlistEvidenceEvent[]
  live_events: WatchlistEvidenceLiveEvent[]
  market?: WatchlistMarketQuote | null
  causality: 'not_established'
  uncertainty: string[]
  limitations: string[]
}

export type WatchlistAlertKind = 'target_price' | 'stop_loss' | 'percent_move' | 'event_severity'

export interface WatchlistAlertRule {
  id: string
  user_id: number
  watchlist_id: string
  ticker: string
  kind: WatchlistAlertKind
  threshold?: number | null
  percent_threshold?: number | null
  direction?: 'above' | 'below' | null
  cooldown_seconds: number
  is_active: boolean
  last_state?: string | null
  last_triggered_at?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface WatchlistAlertEvent {
  id: string
  rule_id: string
  user_id: number
  watchlist_id: string
  ticker: string
  kind: string
  direction?: string | null
  message: string
  observed_price?: number | null
  threshold?: number | null
  delivered: boolean
  is_read: boolean
  read_at?: string | null
  dedupe_key: string
  triggered_at: string
}

export interface WatchlistAlertSchedulerHealth {
  schedule_minutes: number
  lock_ttl_seconds: number
  is_running: boolean
  runs_last_24h: number
  failures_last_24h: number
  last_run_at?: string | null
  last_run_status?: string | null
  last_run_error?: string | null
  last_success_at?: string | null
}

export interface WatchlistAlertEvaluation {
  evaluated_rules: number
  triggered: WatchlistAlertEvent[]
  quotes_checked: number
  unavailable_tickers: string[]
  not_evaluable: string[]
  limitations: string[]
}

export interface WatchlistAtlasAsset {
  ticker: string
  company_name?: string | null
  asset_type: string
  market: WatchlistMarketQuote
  association_reliability: 'recorded' | 'candidate' | 'none'
}

export interface WatchlistAtlasContext {
  generated_at: string
  total_tracked: number
  assets: WatchlistAtlasAsset[]
  movers: WatchlistAtlasAsset[]
  unavailable_tickers: string[]
  causality: 'not_established'
  uncertainty: string[]
  limitations: string[]
}

export interface PortfolioSummary {
  total_invested: number
  total_earned: number
  total_value: number
  total_profit_loss: number
  total_profit_loss_percent: number
  realised_profit_loss: number
  withdrawable_balance: number
  open_trades_count: number
  closed_trades_count: number
}

export interface Profile {
  id: number
  email: string
  display_name: string
  is_active: boolean
  total_invested: number
  total_earned: number
  withdrawable_balance: number
  created_at: string
  updated_at?: string
}

/**
 * Direction indicator for P&L display.
 */
export type PnLDirection = 'up' | 'down' | 'neutral'

/**
 * Helper to determine P&L direction from profit/loss value.
 */
export function getPnLDirection(pnl: number | undefined): PnLDirection {
  if (pnl === undefined || pnl === 0) return 'neutral'
  return pnl > 0 ? 'up' : 'down'
}

/**
 * Format a number as currency with optional sign and color indicator.
 */
export function formatCurrency(value: number, showSign = true): string {
  const formatted = Math.abs(value).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })
  if (!showSign) return formatted
  if (value === 0) return formatted
  return (value > 0 ? '+' : '-') + formatted
}

/**
 * Format a percentage value.
 */
export function formatPercent(value: number, showSign = true): string {
  if (value === 0 && !showSign) return '0%'
  const sign = showSign && value !== 0 ? (value > 0 ? '+' : '-') : ''
  return `${sign}${Math.abs(value).toFixed(2)}%`
}

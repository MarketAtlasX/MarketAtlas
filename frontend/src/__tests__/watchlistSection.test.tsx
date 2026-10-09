import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import WatchlistSection from '../features/profile/WatchlistSection'
import { commandBus } from '../assistant/commands/commandBus'
import {
  filterWatchlist,
  formatChangePercent,
  formatPrice,
  relativeTime,
  sortWatchlist,
  type WatchlistSortKey,
} from '../features/profile/watchlistUtils'
import type { WatchlistQuoteItem } from '../types'

const api = vi.hoisted(() => ({
  getWatchlistQuotes: vi.fn(),
  getWatchlist: vi.fn(),
  getWatchlistHistory: vi.fn(),
  getWatchlistEvidence: vi.fn(),
  getAlertRules: vi.fn(),
  getAlertEvents: vi.fn(),
  getAlertUnreadCount: vi.fn(),
  getAlertSchedulerHealth: vi.fn(),
  markAlertEventRead: vi.fn(),
  markAllAlertEventsRead: vi.fn(),
  createAlertRule: vi.fn(),
  updateAlertRule: vi.fn(),
  deleteAlertRule: vi.fn(),
  evaluateAlerts: vi.fn(),
  addToWatchlist: vi.fn(),
  updateWatchlistItem: vi.fn(),
  removeFromWatchlist: vi.fn(),
}))

vi.mock('../api/profileApi', () => api)

function quoteItem(overrides: Partial<WatchlistQuoteItem> = {}): WatchlistQuoteItem {
  return {
    id: 'w1',
    user_id: 1,
    ticker: 'XOM',
    company_name: 'Exxon Mobil',
    asset_type: 'stock',
    target_price: 130,
    stop_loss: 95,
    notes: undefined,
    is_active: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-08T00:00:00Z',
    market: {
      status: 'provider-backed',
      symbol: 'XOM',
      price: 120.5,
      change: 2.5,
      change_percent: 2.11,
      previous_close: 118,
      currency: 'USD',
      provider: 'alphavantage',
      observed_at: '2026-10-08T14:00:00Z',
      freshness: 'current',
      limitations: [],
    },
    ...overrides,
  }
}

function renderSection() {
  return render(<WatchlistSection onTradeRequest={vi.fn()} />)
}

beforeEach(() => {
  vi.clearAllMocks()
  api.getWatchlistQuotes.mockResolvedValue([quoteItem()])
  api.getWatchlist.mockResolvedValue([])
  api.getWatchlistHistory.mockResolvedValue({
    status: 'provider-backed',
    symbol: 'XOM',
    interval: 'daily',
    provider: 'alphavantage',
    freshness: 'historical',
    points: [
      { date: '2026-10-01', close: 118 },
      { date: '2026-10-02', close: 120.5 },
    ],
    limitations: [],
  })
  api.getAlertRules.mockResolvedValue([])
  api.getAlertEvents.mockResolvedValue([])
  api.getAlertSchedulerHealth.mockResolvedValue({
    schedule_minutes: 5,
    lock_ttl_seconds: 300,
    is_running: false,
    runs_last_24h: 12,
    failures_last_24h: 0,
    last_run_at: '2026-10-09T11:55:00Z',
    last_run_status: 'success',
    last_run_error: null,
    last_success_at: '2026-10-09T11:55:00Z',
  })
  api.markAlertEventRead.mockResolvedValue({})
  api.markAllAlertEventsRead.mockResolvedValue(1)
})

describe('WatchlistSection', () => {
  it('renders provider-backed market data with provider and update time', async () => {
    renderSection()

    expect(await screen.findByText('XOM')).toBeInTheDocument()
    expect(screen.getByText('$120.50')).toBeInTheDocument()
    expect(screen.getByText('+2.50')).toBeInTheDocument()
    expect(screen.getByText('+2.11%')).toBeInTheDocument()
    expect(screen.getByText('TARGET $130.00')).toBeInTheDocument()
    expect(screen.getByText('STOP $95.00')).toBeInTheDocument()
    expect(screen.getByText(/alphavantage · USD/)).toBeInTheDocument()
  })

  it('shows an empty state when nothing is tracked', async () => {
    api.getWatchlistQuotes.mockResolvedValue([])
    renderSection()
    expect(await screen.findByText(/Nothing tracked yet/)).toBeInTheDocument()
  })

  it('shows an error with retry when both endpoints fail, then recovers', async () => {
    api.getWatchlistQuotes.mockRejectedValueOnce(new Error('offline'))
    api.getWatchlist.mockRejectedValueOnce(new Error('offline'))
    renderSection()

    expect(await screen.findByText(/Unable to load your watchlist/)).toBeInTheDocument()
    const retry = screen.getByRole('button', { name: /retry/i })
    api.getWatchlistQuotes.mockResolvedValue([quoteItem()])
    fireEvent.click(retry)
    expect(await screen.findByText('$120.50')).toBeInTheDocument()
  })

  it('degrades gracefully to an explicit no-price state when market data fails', async () => {
    api.getWatchlistQuotes.mockRejectedValue(new Error('offline'))
    api.getWatchlist.mockResolvedValue([
      {
        id: 'w1',
        user_id: 1,
        ticker: 'XOM',
        company_name: 'Exxon Mobil',
        asset_type: 'stock',
        is_active: true,
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-08T00:00:00Z',
      },
    ])
    renderSection()

    expect(
      await screen.findByText(/Live market data is unavailable/),
    ).toBeInTheDocument()
    expect(screen.getAllByText('NO PRICE').length).toBeGreaterThan(0)
    // No fabricated price is rendered.
    expect(screen.queryByText(/\$\d/)).not.toBeInTheDocument()
  })

  it('does not fabricate a price for an unavailable provider envelope', async () => {
    api.getWatchlistQuotes.mockResolvedValue([
      quoteItem({
        ticker: 'AAPL',
        market: {
          status: 'unavailable',
          symbol: 'AAPL',
          price: null,
          change: null,
          change_percent: null,
          previous_close: null,
          currency: null,
          provider: null,
          observed_at: null,
          freshness: 'unknown',
          limitations: ['No provider quote available.'],
        },
      }),
    ])
    renderSection()

    expect(await screen.findByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('NO PRICE')).toBeInTheDocument()
    expect(screen.getByText('unavailable')).toBeInTheDocument()
  })

  it('loads a sparkline from provider history when a row is expanded', async () => {
    renderSection()
    await screen.findByText('XOM')

    fireEvent.click(screen.getByRole('button', { name: /Show history for XOM/i }))
    expect(await screen.findByLabelText('sparkline')).toBeInTheDocument()
    expect(api.getWatchlistHistory).toHaveBeenCalledWith('w1')
  })

  it('opens the evidence panel and focuses the globe on the associated geography', async () => {
    const emitted: string[] = []
    const unsubscribe = commandBus.subscribe(command => emitted.push(command.type))

    api.getWatchlistEvidence.mockResolvedValue({
      ticker: 'XOM',
      asset_type: 'stock',
      association_reliability: 'recorded',
      association_methods: ['recorded_entity_link'],
      entity: { id: 7, name: 'Exxon Mobil Corp', entity_type: 'company', country_code: 'US' },
      geography: { label: 'Exxon Mobil Corp', country_code: 'US', source: 'entity' },
      events: [
        {
          id: 1,
          title: 'Sanctions reshape oil flows',
          event_type: 'sanction',
          severity: 'high',
          status: 'reported',
          event_date: '2026-10-05T00:00:00Z',
          source: 'Test Wire',
          source_url: 'https://example.com/oil',
          association: 'recorded_entity_link',
        },
      ],
      live_events: [],
      market: null,
      causality: 'not_established',
      uncertainty: ['Correlation is not causation: this bundle lists associations, not verified causes.'],
      limitations: [],
    })

    renderSection()
    await screen.findByText('XOM')
    fireEvent.click(screen.getByRole('button', { name: /Geopolitical evidence for XOM/i }))

    expect(await screen.findByText('Sanctions reshape oil flows')).toBeInTheDocument()
    expect(screen.getByText(/Correlation is not causation/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Focus globe/i }))
    expect(emitted).toContain('FOCUS_COUNTRY')
    unsubscribe()
  })

  it('manages alert rules in the alerts panel', async () => {
    api.createAlertRule.mockResolvedValue({})
    api.getAlertRules.mockResolvedValue([
      {
        id: 'r1',
        user_id: 1,
        watchlist_id: 'w1',
        ticker: 'XOM',
        kind: 'percent_move',
        percent_threshold: 5,
        threshold: null,
        direction: null,
        cooldown_seconds: 900,
        is_active: true,
        last_state: null,
        last_triggered_at: null,
        notes: null,
        created_at: '2026-10-08T00:00:00Z',
        updated_at: '2026-10-08T00:00:00Z',
      },
    ])

    renderSection()
    await screen.findByText('XOM')
    fireEvent.click(screen.getByRole('button', { name: /Alerts for XOM/i }))

    expect(await screen.findByText(/percent move 5%/i)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Alert kind'), { target: { value: 'stop_loss' } })
    fireEvent.change(screen.getByPlaceholderText('Threshold price'), { target: { value: '90' } })
    fireEvent.click(screen.getByRole('button', { name: /Add rule/i }))

    await waitFor(() =>
      expect(api.createAlertRule).toHaveBeenCalledWith(
        expect.objectContaining({ watchlist_id: 'w1', kind: 'stop_loss', threshold: 90 }),
      ),
    )
  })

  it('shows unread alerts, marks one read, and surfaces scheduler health', async () => {
    api.getAlertEvents.mockResolvedValue([
      {
        id: 'e1',
        rule_id: 'r1',
        user_id: 1,
        watchlist_id: 'w1',
        ticker: 'XOM',
        kind: 'target_price',
        direction: 'above',
        message: 'Target price crossed: XOM at or above 130.',
        observed_price: 131,
        threshold: 130,
        delivered: false,
        is_read: false,
        read_at: null,
        dedupe_key: 'k1',
        triggered_at: '2026-10-09T11:00:00Z',
      },
    ])

    renderSection()
    await screen.findByText('XOM')
    fireEvent.click(screen.getByRole('button', { name: /Alerts for XOM/i }))

    expect(await screen.findByText(/Target price crossed/)).toBeInTheDocument()
    expect(screen.getByText(/1 UNREAD/)).toBeInTheDocument()
    expect(screen.getByText(/every 5m/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Mark XOM alert read/i }))
    await waitFor(() => expect(api.markAlertEventRead).toHaveBeenCalledWith('e1'))
  })

  it('prefills and saves an edited entry', async () => {
    api.updateWatchlistItem.mockResolvedValue({})
    renderSection()
    await screen.findByText('XOM')

    fireEvent.click(screen.getByRole('button', { name: /Edit XOM/i }))
    const companyInput = screen.getByPlaceholderText('Company (optional)') as HTMLInputElement
    expect(companyInput.value).toBe('Exxon Mobil')

    fireEvent.change(companyInput, { target: { value: 'Exxon Mobil Corp' } })
    fireEvent.click(screen.getByRole('button', { name: /Save/i }))

    await waitFor(() =>
      expect(api.updateWatchlistItem).toHaveBeenCalledWith(
        'w1',
        expect.objectContaining({ company_name: 'Exxon Mobil Corp', asset_type: 'stock' }),
      ),
    )
  })
})

describe('watchlistUtils', () => {
  it('formats prices, change and relative time without inventing values', () => {
    expect(formatPrice(null)).toBe('—')
    expect(formatPrice(120.5, 'USD')).toBe('$120.50')
    expect(formatChangePercent(null)).toBe('—')
    expect(formatChangePercent(-1.2)).toBe('-1.20%')
    expect(relativeTime(null)).toBe('unknown')
    expect(relativeTime('2026-10-09T11:59:58Z', Date.parse('2026-10-09T12:00:00Z'))).toBe('just now')
    expect(relativeTime('2026-10-09T11:00:00Z', Date.parse('2026-10-09T12:00:00Z'))).toBe('1h ago')
  })

  it('filters by text and asset type', () => {
    const items = [
      quoteItem({ id: 'a', ticker: 'XOM', company_name: 'Exxon Mobil', asset_type: 'stock' }),
      quoteItem({ id: 'b', ticker: 'GC', company_name: 'Gold', asset_type: 'commodity' }),
    ]
    expect(filterWatchlist(items, { query: 'gold' }).map(i => i.ticker)).toEqual(['GC'])
    expect(filterWatchlist(items, { assetType: 'stock' }).map(i => i.ticker)).toEqual(['XOM'])
    expect(filterWatchlist(items, {}).length).toBe(2)
  })

  it('sorts by movement, putting quote-less entries last', () => {
    const items = [
      quoteItem({ id: 'a', ticker: 'A', market: { ...quoteItem().market, change_percent: -3 } }),
      quoteItem({ id: 'b', ticker: 'B', market: { ...quoteItem().market, status: 'unavailable', change_percent: null } }),
      quoteItem({ id: 'c', ticker: 'C', market: { ...quoteItem().market, change_percent: 5 } }),
    ]
    const ordered = sortWatchlist(items, 'movement' satisfies WatchlistSortKey, 'desc')
    expect(ordered.map(i => i.ticker)).toEqual(['C', 'A', 'B'])
  })
})

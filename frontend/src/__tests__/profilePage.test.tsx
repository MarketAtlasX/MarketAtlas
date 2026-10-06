import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { withProviders } from './harness'
import ProfilePage from '../features/profile/ProfilePage'

const { profile, summary, trades, watchlist } = vi.hoisted(() => ({
  profile: {
    id: 1,
    email: 'operator@test.com',
    display_name: 'Operator',
    is_active: true,
    total_invested: 1000,
    total_earned: 600,
    withdrawable_balance: 0,
    created_at: '2026-01-15T00:00:00Z',
  },
  summary: {
    total_invested: 1000,
    total_earned: 600,
    total_value: 1100,
    total_profit_loss: 100,
    total_profit_loss_percent: 10,
    realised_profit_loss: 250,
    withdrawable_balance: 250,
    open_trades_count: 1,
    closed_trades_count: 2,
  },
  trades: [
    {
      id: 'trade-1',
      user_id: 1,
      ticker: 'NVDA',
      company_name: 'NVIDIA Corp',
      trade_type: 'intraday',
      action: 'buy',
      quantity: 10,
      price_per_share: 100,
      total_amount: 1000,
      current_price: 110,
      current_value: 1100,
      profit_loss: 100,
      profit_loss_percent: 10,
      status: 'open',
      created_at: '2026-02-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
    },
  ],
  watchlist: [
    {
      id: 'watch-1',
      user_id: 1,
      ticker: 'XOM',
      company_name: 'Exxon Mobil',
      asset_type: 'stock',
      target_price: 130,
      stop_loss: 95,
      is_active: true,
      created_at: '2026-02-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
    },
  ],
}))

vi.mock('../api/profileApi', () => ({
  getProfile: vi.fn(async () => profile),
  updateProfile: vi.fn(async () => profile),
  getPortfolioSummary: vi.fn(async () => summary),
  getTrades: vi.fn(async () => trades),
  createTrade: vi.fn(),
  updateTrade: vi.fn(),
  closeTrade: vi.fn(),
  deleteTrade: vi.fn(),
  getWatchlist: vi.fn(async () => watchlist),
  addToWatchlist: vi.fn(),
  updateWatchlistItem: vi.fn(),
  removeFromWatchlist: vi.fn(),
}))

function renderProfile() {
  return render(withProviders(<ProfilePage />, ['/profile']))
}

describe('ProfilePage', () => {
  it('shows money invested, earned and withdrawable totals', async () => {
    renderProfile()

    expect(await screen.findByText('$1,000.00')).toBeInTheDocument()
    expect(screen.getByText('$600.00')).toBeInTheDocument()
    expect(screen.getByText('$250.00')).toBeInTheDocument()
    expect(screen.getByText('+$100.00')).toBeInTheDocument()
    expect(screen.getByText('+10.00% vs invested')).toBeInTheDocument()
    expect(screen.getByText('operator@test.com')).toBeInTheDocument()
  })

  it('lists held positions with trade type and buy/sell actions', async () => {
    renderProfile()

    expect(await screen.findByText('NVDA')).toBeInTheDocument()
    expect(screen.getByText('NVIDIA Corp')).toBeInTheDocument()
    expect(screen.getByText('intraday')).toBeInTheDocument()
    expect(screen.getByTitle('Buy more NVDA')).toBeInTheDocument()
    expect(screen.getByTitle('Sell NVDA')).toBeInTheDocument()
    expect(screen.getByTitle('Close position')).toBeInTheDocument()
  })

  it('lists watchlist tickers with target and stop levels', async () => {
    renderProfile()

    expect(await screen.findByText('XOM')).toBeInTheDocument()
    expect(screen.getByText('Exxon Mobil')).toBeInTheDocument()
    expect(screen.getByText('TARGET $130.00')).toBeInTheDocument()
    expect(screen.getByText('STOP $95.00')).toBeInTheDocument()
    expect(screen.getByTitle('Buy XOM')).toBeInTheDocument()
    expect(screen.getByTitle('Sell XOM')).toBeInTheDocument()
  })
})

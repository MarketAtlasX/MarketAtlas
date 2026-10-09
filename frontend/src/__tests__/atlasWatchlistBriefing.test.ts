import { describe, expect, it, vi, beforeEach } from 'vitest'
import { buildWatchlistBriefing } from '../assistant/brain/watchlistBriefing'
import { planAtlasRequest } from '../assistant/agent/atlasPlanner'
import { executeAtlasToolAsync } from '../assistant/agent/atlasTools'
import { getWatchlistAtlasContext } from '../api/profileApi'
import type { AtlasState } from '../stores/AtlasStore'
import type { WatchlistAtlasContext } from '../types'

vi.mock('../api/profileApi', () => ({
  getWatchlistAtlasContext: vi.fn(),
}))

const mockedContext = vi.mocked(getWatchlistAtlasContext)

const baseMarket = {
  status: 'provider-backed' as const,
  symbol: 'XOM',
  price: 120.5,
  change: 2.5,
  change_percent: 2.11,
  previous_close: 118,
  currency: 'USD',
  provider: 'alphavantage',
  observed_at: '2026-10-09T11:00:00Z',
  freshness: 'current',
  limitations: [],
}

function context(overrides: Partial<WatchlistAtlasContext> = {}): WatchlistAtlasContext {
  return {
    generated_at: '2026-10-09T12:00:00Z',
    total_tracked: 2,
    assets: [
      { ticker: 'XOM', company_name: 'Exxon Mobil', asset_type: 'stock', market: baseMarket, association_reliability: 'recorded' },
      {
        ticker: 'GC',
        company_name: 'Gold',
        asset_type: 'commodity',
        market: { ...baseMarket, symbol: 'GC', status: 'unavailable', price: null, change: null, change_percent: null },
        association_reliability: 'none',
      },
    ],
    movers: [
      { ticker: 'XOM', company_name: 'Exxon Mobil', asset_type: 'stock', market: baseMarket, association_reliability: 'recorded' },
    ],
    unavailable_tickers: ['GC'],
    causality: 'not_established',
    uncertainty: ['Movements are reported from provider data; no causal claim is made.'],
    limitations: [],
    ...overrides,
  }
}

const state: AtlasState = {
  camera: { lat: 18, lng: 18, altitude: 1.92, target: null },
  activeLayer: 'world',
  selectedCountry: null,
  selectedCity: null,
  selectedEvent: null,
  selectedCompany: null,
  highlightedEntities: [],
  tracedRoute: [],
  openPanel: null,
  activeTab: null,
  chartSymbol: null,
  timeframe: '1D',
  search: '',
  watchlist: [],
  analysis: { query: '', status: 'idle', source: null, updatedAt: null, confidence: null, uncertainty: null },
  execution: 'idle',
  lastCommand: null,
  executionSteps: [],
  actionHistory: [],
  latestEvidence: null,
  evidence: { selection: null, status: 'idle', observation: null, error: null },
}

beforeEach(() => {
  mockedContext.mockReset()
})

describe('buildWatchlistBriefing', () => {
  it('handles an empty watchlist without inventing data', () => {
    const brief = buildWatchlistBriefing(null)
    expect(brief.tracked).toBe(0)
    expect(brief.hasLiveData).toBe(false)
    expect(brief.text).toMatch(/empty/i)
  })

  it('reports provider-backed movers and unavailability, never causality', () => {
    const brief = buildWatchlistBriefing(context())
    expect(brief.hasLiveData).toBe(true)
    expect(brief.text).toMatch(/XOM/)
    expect(brief.text).toMatch(/up \+2\.11%/) // sign is reported on the absolute value
    expect(brief.uncertainty.some(note => note.includes('GC'))).toBe(true)
    expect(brief.text.toLowerCase()).not.toMatch(/caused|because of|due to/)
    expect(brief.text).toMatch(/no causal claim/i)
  })

  it('flags when no provider-backed data is available', () => {
    const brief = buildWatchlistBriefing(
      context({
        assets: [],
        movers: [],
        unavailable_tickers: ['XOM'],
      }),
    )
    expect(brief.hasLiveData).toBe(false)
  })
})

describe('ATLAS watchlist tool', () => {
  it('returns a grounded briefing from the authorized context', async () => {
    mockedContext.mockResolvedValue(context())
    const result = await executeAtlasToolAsync('brief_watchlist', {}, {
      currentQuery: 'What changed for my watchlist today?',
      previousEntity: null,
      selectedCompany: null,
    })
    expect(result.ok).toBe(true)
    const observation = result.observation as { watchlistBriefing?: { text: string }; watchlistContext?: unknown }
    expect(observation.watchlistBriefing?.text).toMatch(/XOM/)
    expect(observation.watchlistContext).toBeDefined()
  })

  it('reports unavailability rather than fabricating a briefing', async () => {
    mockedContext.mockRejectedValue(new Error('401 unauthorized'))
    const result = await executeAtlasToolAsync('brief_watchlist', {}, {
      currentQuery: 'Watchlist summary',
      previousEntity: null,
      selectedCompany: null,
    })
    expect(result.ok).toBe(false)
    const observation = result.observation as { watchlistBriefing?: { text: string; uncertainty: string[] } }
    expect(observation.watchlistBriefing?.text).toMatch(/unavailable/i)
  })
})

describe('ATLAS planner watchlist intent', () => {
  it('routes a briefing question to brief_watchlist', () => {
    const plan = planAtlasRequest('What changed for my watchlist today?', state)
    expect(plan.steps.map(step => step.tool)).toContain('brief_watchlist')
  })

  it('routes a plain watchlist request to show_watchlist', () => {
    const plan = planAtlasRequest('Show my watchlist', state)
    expect(plan.steps.map(step => step.tool)).toContain('show_watchlist')
    expect(plan.steps.map(step => step.tool)).not.toContain('brief_watchlist')
  })
})

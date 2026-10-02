import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, waitFor } from '@testing-library/react'
import { WorldProvider, useWorldStore, type WorldStoreState } from '../stores/WorldStore'
import { AtlasProvider, useAtlasStore, type AtlasState } from '../stores/AtlasStore'
import { useLiveWorldSocket } from '../services/websocket/useLiveWorldSocket'
import { useLiveEvidenceRefresh } from '../features/evidence/useLiveEvidenceRefresh'
import LiveEventsTab from '../features/world-command/tabs/LiveEventsTab'
import {
  formatMarketChangePercent,
  formatMarketValue,
  marketObservationEntity,
} from '../features/evidence/marketObservations'
import type { EvidenceObservation } from '../api/evidenceApi'
import type { LiveEvent } from '../types'

// ── Pure helpers: nothing is invented for a missing value ────────────────────

describe('market observation helpers', () => {
  it('resolves a navigable entity only from a provider-supplied symbol', () => {
    expect(marketObservationEntity({ symbol: 'TSM', status: 'provider-backed' })).toBe('TSM')
    expect(marketObservationEntity({ symbol: '  ', status: 'unavailable' })).toBeNull()
    expect(marketObservationEntity(null)).toBeNull()
  })

  it('returns null rather than a value for missing numbers', () => {
    expect(formatMarketValue(undefined)).toBeNull()
    expect(formatMarketValue('not-a-number')).toBeNull()
    expect(formatMarketChangePercent(null)).toBeNull()
    expect(formatMarketValue(182.4)).toBe('182.40')
    expect(formatMarketChangePercent(4.8)).toBe('+4.80%')
    expect(formatMarketChangePercent(0)).toBe('0.00%')
  })
})

// ── Test doubles ────────────────────────────────────────────────────────────

class MockWebSocket {
  static instances: MockWebSocket[] = []
  url: string
  onopen: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  sent: string[] = []

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  send(raw: string) {
    this.sent.push(raw)
  }

  close() {
    this.onclose?.()
  }

  serverOpen() {
    this.onopen?.()
  }

  serverSend(message: unknown) {
    this.onmessage?.({ data: typeof message === 'string' ? message : JSON.stringify(message) })
  }
}

function worldSockets(): MockWebSocket[] {
  return MockWebSocket.instances.filter(socket => socket.url === '/ws')
}

const pending: Array<{ query: string; resolve: (body: unknown) => void }> = []
const observationRequests: string[] = []

function installFetchMock() {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/live-events/observation')) {
        const match = /[?&]query=([^&]+)/.exec(url)
        const query = match ? decodeURIComponent(match[1]) : ''
        observationRequests.push(query)
        return new Promise<Response>(resolve => {
          pending.push({ query, resolve: body => resolve(new Response(JSON.stringify(body), { status: 200 })) })
        })
      }
      return Promise.resolve(new Response(JSON.stringify({ items: [] }), { status: 200 }))
    }),
  )
}

async function resolveObservation(query: string, body: EvidenceObservation) {
  await waitFor(() => expect(pending.some(item => item.query === query)).toBe(true))
  const index = pending.findIndex(item => item.query === query)
  const request = pending[index]
  pending.splice(index, 1)
  request.resolve(body)
}

function newEventFrame(id: string, title: string, minutesAgo = 1) {
  const ts = new Date(Date.now() - minutesAgo * 60000).toISOString()
  return {
    type: 'live_event_new',
    timestamp: ts,
    data: {
      id,
      title,
      severity: 7,
      lat: 23.8,
      lng: 121.0,
      country_code: 'TW',
      status: 'breaking',
      event_date: ts,
    },
  }
}

const TAIWAN_MARKETS: EvidenceObservation = {
  status: 'live',
  freshness: 'current',
  event: { title: 'Naval drills reported near Taiwan' },
  market_observations: [
    {
      symbol: 'TSM',
      status: 'provider-backed',
      price: 182.4,
      change_percent: 4.8,
      provider: 'yfinance',
      freshness: 'current',
      timestamp: '2026-10-01T12:00:00Z',
    },
    { symbol: 'XOM', status: 'unavailable', freshness: 'unknown' },
  ],
  provider_status: { market_data: 'live' },
  provenance: { provider: 'FEED-TW', observed_at: '2026-10-01T06:00:00Z', confidence: 0.7 },
}

// ── Harness (mirrors the WorldCommandCenter wiring) ─────────────────────────

let worldState: WorldStoreState | null = null
let atlasState: AtlasState | null = null

function MarketHarness() {
  const { state: world, selectEntity } = useWorldStore()
  const { state: atlas, update } = useAtlasStore()
  const { onLiveEvent } = useLiveEvidenceRefresh(world.selectedEntity, { refreshIntervalMs: 0 })
  useLiveWorldSocket({ onLiveEvent })

  const focusEntity = (entity: string, eventTitle: string | null = null) => {
    selectEntity(entity)
    update({ selectedCountry: entity, selectedCity: null, selectedEvent: eventTitle, highlightedEntities: [entity], openPanel: 'evidence' })
  }

  const handleSelectEvent = (event: LiveEvent) => {
    const loc = event.country?.trim() || event.countryCode?.trim()
    if (!loc) return
    focusEntity(loc, event.title)
  }

  worldState = world
  atlasState = atlas
  return (
    <LiveEventsTab
      onSelectEvent={handleSelectEvent}
      evidence={atlas.evidence}
      selectedEvent={atlas.selectedEvent}
      onSelectEntity={entity => focusEntity(entity)}
    />
  )
}

function renderTimeline() {
  return render(
    <WorldProvider>
      <AtlasProvider>
        <MarketHarness />
      </AtlasProvider>
    </WorldProvider>,
  )
}

function rowFor(id: string): HTMLElement {
  const row = document.querySelector(`[data-testid="live-event-row"][data-event-id="${id}"]`)
  if (!row) throw new Error(`No timeline row for ${id}`)
  return row as HTMLElement
}

function marketChips(): HTMLElement[] {
  return Array.from(document.querySelectorAll('[data-testid="event-market-chip"]'))
}

beforeEach(() => {
  MockWebSocket.instances = []
  vi.stubGlobal('WebSocket', MockWebSocket)
  installFetchMock()
})

afterEach(() => {
  vi.unstubAllGlobals()
  pending.length = 0
  observationRequests.length = 0
  MockWebSocket.instances = []
  worldState = null
  atlasState = null
})

// ── Event → evidence → market flow ──────────────────────────────────────────

describe('event timeline market impact', () => {
  it('binds the focused event row to the canonical market observations for its selection', async () => {
    renderTimeline()
    const ws = worldSockets()[0]
    act(() => ws.serverOpen())
    act(() => ws.serverSend(newEventFrame('ev-tw', 'Naval drills reported near Taiwan')))
    await waitFor(() => expect(rowFor('ev-tw')).toBeTruthy())

    // No market strip until the event is focused.
    expect(marketChips()).toHaveLength(0)

    fireEvent.click(rowFor('ev-tw'))
    await waitFor(() => expect(observationRequests).toContain('Taiwan'))

    // While the canonical evidence loads the strip says so, rather than showing
    // stale or synthetic values.
    await waitFor(() => expect(document.querySelector('[data-testid="event-market-loading"]')).not.toBeNull())

    await resolveObservation('Taiwan', TAIWAN_MARKETS)
    await waitFor(() => expect(document.querySelector('[data-testid="event-market-observations"]')).not.toBeNull())

    const chips = marketChips()
    expect(chips.map(chip => chip.getAttribute('data-symbol'))).toEqual(['TSM', 'XOM'])
    expect(chips[0].getAttribute('data-status')).toBe('provider-backed')
    expect(chips[0].textContent).toContain('TSM')
    expect(chips[0].textContent).toContain('+4.80%')
    expect(chips[0].textContent).toContain('LIVE')
    // Availability/freshness/provider live in the chip title.
    expect(chips[0].getAttribute('title')).toContain('yfinance')
    expect(chips[0].getAttribute('title')).toContain('CURRENT')

    // The unavailable market is explicit — no fabricated value.
    expect(chips[1].getAttribute('data-status')).toBe('unavailable')
    expect(chips[1].textContent).toContain('UNAVAILABLE')
  })

  it('routes an affected market asset click back through the globe focus path', async () => {
    renderTimeline()
    const ws = worldSockets()[0]
    act(() => ws.serverOpen())
    act(() => ws.serverSend(newEventFrame('ev-tw', 'Naval drills reported near Taiwan')))
    fireEvent.click(await waitFor(() => rowFor('ev-tw')))

    await waitFor(() => expect(observationRequests).toContain('Taiwan'))
    await resolveObservation('Taiwan', TAIWAN_MARKETS)
    await waitFor(() => expect(marketChips()).toHaveLength(2))

    fireEvent.click(marketChips()[0])

    // The existing globe selection + evidence lifecycle react to the asset.
    await waitFor(() => expect(worldState!.selectedEntity).toBe('TSM'))
    expect(atlasState!.selectedCountry).toBe('TSM')
    expect(atlasState!.openPanel).toBe('evidence')
    await waitFor(() => expect(observationRequests).toContain('TSM'))

    await resolveObservation('TSM', { status: 'live', freshness: 'current', market_observations: [{ symbol: 'TSM', status: 'provider-backed', price: 182.4 }] })
    await waitFor(() => expect(atlasState!.evidence.selection).toBe('TSM'))
  })

  it('labels simulated market data as SIMULATED on the timeline', async () => {
    renderTimeline()
    const ws = worldSockets()[0]
    act(() => ws.serverOpen())
    act(() => ws.serverSend(newEventFrame('ev-tw', 'Naval drills reported near Taiwan')))
    fireEvent.click(await waitFor(() => rowFor('ev-tw')))

    await waitFor(() => expect(observationRequests).toContain('Taiwan'))
    await resolveObservation('Taiwan', {
      status: 'degraded',
      freshness: 'simulated',
      market_observations: [{ symbol: 'TSM', status: 'simulated', price: 100, change_percent: 1.2, freshness: 'simulated' }],
    })

    await waitFor(() => expect(marketChips()).toHaveLength(1))
    expect(marketChips()[0].getAttribute('data-status')).toBe('simulated')
    expect(marketChips()[0].textContent).toContain('SIMULATED')
    expect(document.querySelector('[data-testid="event-market-observations"]')?.textContent).not.toContain('DEMO')
  })

  it('states that markets are unavailable when the observation carries no market records', async () => {
    renderTimeline()
    const ws = worldSockets()[0]
    act(() => ws.serverOpen())
    act(() => ws.serverSend(newEventFrame('ev-tw', 'Naval drills reported near Taiwan')))
    fireEvent.click(await waitFor(() => rowFor('ev-tw')))

    await waitFor(() => expect(observationRequests).toContain('Taiwan'))
    await resolveObservation('Taiwan', { status: 'live', freshness: 'current', market_observations: [] })

    await waitFor(() =>
      expect(document.querySelector('[data-testid="event-market-unavailable"]')?.textContent).toContain('MARKETS UNAVAILABLE'),
    )
    expect(marketChips()).toHaveLength(0)
  })
})

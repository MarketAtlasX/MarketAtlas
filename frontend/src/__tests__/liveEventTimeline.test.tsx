import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, waitFor } from '@testing-library/react'
import { WorldProvider, useWorldStore, type WorldStoreState } from '../stores/WorldStore'
import { AtlasProvider, useAtlasStore, type AtlasState } from '../stores/AtlasStore'
import { useLiveWorldSocket } from '../services/websocket/useLiveWorldSocket'
import { useLiveEvidenceRefresh } from '../features/evidence/useLiveEvidenceRefresh'
import LiveEventsTab from '../features/world-command/tabs/LiveEventsTab'
import type { EvidenceObservation } from '../api/evidenceApi'
import type { LiveEvent } from '../types'

// ── Test doubles ────────────────────────────────────────────────────────────

class MockWebSocket {
  static instances: MockWebSocket[] = []
  static failNextConstruct = false
  url: string
  onopen: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  sent: string[] = []

  constructor(url: string) {
    if (MockWebSocket.failNextConstruct) {
      MockWebSocket.failNextConstruct = false
      throw new Error('backend unavailable')
    }
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
/** Mutable live-event bootstrap payload for the REST-honesty tests. */
let bootstrapItems: unknown[] = []
/** When true, the REST bootstrap is held open so tests can control its timing. */
let deferBootstrap = false
const bootstrapPending: Array<(body: unknown) => void> = []

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
      if (url.includes('/api/live-events')) {
        if (deferBootstrap) {
          return new Promise<Response>(resolve => {
            bootstrapPending.push(body => resolve(new Response(JSON.stringify(body), { status: 200 })))
          })
        }
        return Promise.resolve(new Response(JSON.stringify({ items: bootstrapItems }), { status: 200 }))
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }))
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

const TAIWAN_OBSERVATION: EvidenceObservation = {
  status: 'live',
  freshness: 'current',
  event: { title: 'Naval drills reported near Taiwan' },
  provenance: { provider: 'FEED-TW', observed_at: '2026-10-01T06:00:00Z', confidence: 0.7 },
}

// ── Backend frames (timestamps relative to now so status is realistic) ───────

function newEventFrame(
  id: string,
  title: string,
  overrides: { minutesAgo?: number; severity?: number; lat?: number; lng?: number; countryCode?: string; status?: string } = {},
) {
  const minutesAgo = overrides.minutesAgo ?? 1
  const ts = new Date(Date.now() - minutesAgo * 60000).toISOString()
  return {
    type: 'live_event_new',
    timestamp: ts,
    data: {
      id,
      title,
      severity: overrides.severity ?? 7,
      lat: overrides.lat ?? 23.8,
      lng: overrides.lng ?? 121.0,
      country_code: overrides.countryCode ?? 'TW',
      status: overrides.status ?? 'breaking',
      event_date: ts,
    },
  }
}

// ── Harness (mirrors the WorldCommandCenter wiring) ─────────────────────────

let worldState: WorldStoreState | null = null
let atlasState: AtlasState | null = null

function TimelineHarness() {
  const { state: world, selectEntity } = useWorldStore()
  const { state: atlas, update } = useAtlasStore()
  const { onLiveEvent } = useLiveEvidenceRefresh(world.selectedEntity, { refreshIntervalMs: 0 })
  useLiveWorldSocket({ onLiveEvent })

  const handleSelectEvent = (event: LiveEvent) => {
    const entity = event.country?.trim() || event.countryCode?.trim()
    if (!entity) return
    selectEntity(entity)
    update({ selectedCountry: entity, selectedCity: null, selectedEvent: event.title, highlightedEntities: [entity], openPanel: 'evidence' })
  }

  worldState = world
  atlasState = atlas
  return <LiveEventsTab onSelectEvent={handleSelectEvent} />
}

function renderTimeline() {
  return render(
    <WorldProvider>
      <AtlasProvider>
        <TimelineHarness />
      </AtlasProvider>
    </WorldProvider>,
  )
}

function rows(): HTMLElement[] {
  return Array.from(document.querySelectorAll('[data-testid="live-event-row"]'))
}

function liveRowIds(): string[] {
  return rows()
    .map(row => row.getAttribute('data-event-id') ?? '')
    .filter(id => id.startsWith('ev-'))
}

function rowFor(id: string): HTMLElement {
  const row = rows().find(item => item.getAttribute('data-event-id') === id)
  if (!row) throw new Error(`No timeline row for ${id}`)
  return row
}

beforeEach(() => {
  MockWebSocket.instances = []
  MockWebSocket.failNextConstruct = false
  vi.stubGlobal('WebSocket', MockWebSocket)
  bootstrapItems = []
  deferBootstrap = false
  installFetchMock()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  pending.length = 0
  observationRequests.length = 0
  bootstrapPending.length = 0
  deferBootstrap = false
  MockWebSocket.instances = []
  worldState = null
  atlasState = null
})

// ── Tests ───────────────────────────────────────────────────────────────────

describe('timeline ordering', () => {
  it('shows validated events newest first regardless of arrival order', async () => {
    renderTimeline()
    const ws = worldSockets()[0]
    act(() => ws.serverOpen())

    // Arrive oldest → newest → middle.
    act(() => ws.serverSend(newEventFrame('ev-a', 'Oldest', { minutesAgo: 30 })))
    act(() => ws.serverSend(newEventFrame('ev-b', 'Newest', { minutesAgo: 1 })))
    act(() => ws.serverSend(newEventFrame('ev-c', 'Middle', { minutesAgo: 5 })))

    await waitFor(() => expect(liveRowIds()).toHaveLength(3))
    expect(liveRowIds()).toEqual(['ev-b', 'ev-c', 'ev-a'])
  })

  it('labels a live event older than the staleness window as STALE', async () => {
    renderTimeline()
    const ws = worldSockets()[0]
    act(() => ws.serverOpen())
    act(() => ws.serverSend(newEventFrame('ev-stale', 'Old live report', { minutesAgo: 60 })))

    await waitFor(() => expect(rowFor('ev-stale').getAttribute('data-status')).toBe('STALE'))
    expect(rowFor('ev-stale').getAttribute('data-provenance')).toBe('live')
  })
})

describe('duplicate and malformed handling', () => {
  it('collapses replays and cross-channel duplicates of the same story', async () => {
    renderTimeline()
    const ws = worldSockets()[0]
    act(() => ws.serverOpen())

    const frame = newEventFrame('ev-tw', 'Naval drills reported near Taiwan')
    act(() => ws.serverSend(frame))
    act(() => ws.serverSend(frame))
    // Same story re-broadcast on the `events` channel with a different id.
    act(() =>
      ws.serverSend({
        type: 'event',
        timestamp: new Date().toISOString(),
        data: {
          id: 991,
          title: 'Naval drills reported near Taiwan',
          source_url: 'https://example.test/drill',
          severity: 'high',
          lat: 23.8,
          lng: 121.0,
          country_code: 'TW',
          event_date: new Date().toISOString(),
        },
      }),
    )

    await waitFor(() => expect(rows().some(row => row.getAttribute('data-event-id') === 'ev-tw')).toBe(true))
    expect(rows().filter(row => row.textContent?.includes('Naval drills reported near Taiwan'))).toHaveLength(1)
  })

  it('drops malformed frames without fabricating timeline entries', async () => {
    renderTimeline()
    const seedIds = liveRowIds()
    expect(rows().length).toBeGreaterThan(0)
    expect(rows().every(row => row.getAttribute('data-provenance') === 'simulated')).toBe(true)

    const ws = worldSockets()[0]
    act(() => ws.serverOpen())
    act(() => ws.serverSend('{ not json'))
    act(() => ws.serverSend({ type: 'live_event_new', data: { severity: 5 } })) // no id/title
    act(() => ws.serverSend({ type: 'live_event_new', data: { id: 'bad-geo', title: 'No coords', severity: 5, event_date: new Date().toISOString() } }))
    act(() => ws.serverSend({ type: 'live_event_new', data: { id: 'bad-sev', title: 'No severity', lat: 1, lng: 2, event_date: new Date().toISOString() } }))
    act(() => ws.serverSend({ type: 'live_event_new', data: { id: 'bad-time', title: 'Bad time', severity: 5, lat: 1, lng: 2, event_date: 'never' } }))

    expect(liveRowIds()).toEqual(seedIds)
    expect(worldState!.dataMode).toBe('simulated')
  })

  it('renders the simulated feed when the backend socket is unavailable', () => {
    MockWebSocket.failNextConstruct = true
    expect(() => renderTimeline()).not.toThrow()
    expect(rows().length).toBeGreaterThan(0)
    expect(rows().every(row => row.getAttribute('data-provenance') === 'simulated')).toBe(true)
    expect(document.querySelector('[data-testid="live-event-timeline"]')?.textContent).toContain('NO LIVE UPDATE')
  })
})

describe('live vs simulated labeling', () => {
  it('labels seed rows simulated and backend rows live', async () => {
    renderTimeline()
    expect(rows().every(row => row.getAttribute('data-provenance') === 'simulated')).toBe(true)
    expect(rows().every(row => row.getAttribute('data-status') === 'SIMULATED')).toBe(true)

    const ws = worldSockets()[0]
    act(() => ws.serverOpen())
    act(() => ws.serverSend(newEventFrame('ev-live', 'Fresh backend event', { minutesAgo: 1 })))

    await waitFor(() => expect(rowFor('ev-live').getAttribute('data-provenance')).toBe('live'))
    expect(rowFor('ev-live').getAttribute('data-status')).toBe('LIVE')
    // The seeded rows remain clearly labelled as simulated.
    const seedRows = rows().filter(row => row.getAttribute('data-event-id') !== 'ev-live')
    expect(seedRows.every(row => row.getAttribute('data-provenance') === 'simulated')).toBe(true)
  })
})

describe('REST bootstrap honesty', () => {
  it('labels a REST event live but leaves an unlocated event without a fabricated location', async () => {
    bootstrapItems = [{ id: 1, title: 'Policy rate held', event_type: 'economic', severity: 4, event_date: new Date().toISOString() }]
    renderTimeline()

    await waitFor(() => expect(rowFor('1')).toBeTruthy())
    expect(rowFor('1').getAttribute('data-provenance')).toBe('live')
    expect(rowFor('1').textContent).toContain('LOCATION UNAVAILABLE')
    const mapped = worldState!.events.find(event => event.id === '1')
    expect(mapped?.lat).toBeNull()
    expect(mapped?.lng).toBeNull()
    expect(mapped?.country).toBe('')
  })

  it('keeps a live WebSocket event delivered while the REST bootstrap is in flight', async () => {
    deferBootstrap = true
    bootstrapItems = [{ id: 77, title: 'Policy rate held', event_type: 'economic', severity: 4, event_date: new Date().toISOString() }]
    renderTimeline()

    const ws = worldSockets()[0]
    act(() => ws.serverOpen())
    act(() => ws.serverSend(newEventFrame('ev-live', 'Fresh backend event', { minutesAgo: 1 })))
    await waitFor(() => expect(worldState!.events.some(event => event.id === 'ev-live')).toBe(true))

    // The bootstrap now lands: it drops the simulated seeds but must not
    // clobber the live event the socket already delivered.
    await act(async () => {
      bootstrapPending.splice(0).forEach(resolve => resolve({ items: bootstrapItems }))
    })

    await waitFor(() => expect(worldState!.events.some(event => event.id === '77')).toBe(true))
    expect(worldState!.events.some(event => event.id === 'ev-live')).toBe(true)
    expect(worldState!.events.some(event => event.provenance === 'simulated')).toBe(false)
  })

  it('drops REST rows missing required fields rather than inventing them', async () => {
    bootstrapItems = [
      { id: 2, severity: 4, event_date: new Date().toISOString() }, // no title
      { id: 3, title: 'No severity', event_date: new Date().toISOString() },
      { id: 4, title: 'No timestamp', severity: 3 },
    ]
    renderTimeline()
    await act(async () => {
      await Promise.resolve()
    })

    expect(worldState!.events.some(event => ['2', '3', '4'].includes(event.id))).toBe(false)
    expect(worldState!.dataMode).toBe('simulated')
  })
})

describe('selection → globe focus → evidence', () => {
  it('focuses the backend location and feeds the existing evidence pipeline on click', async () => {
    renderTimeline()
    const ws = worldSockets()[0]
    act(() => ws.serverOpen())
    act(() => ws.serverSend(newEventFrame('ev-tw', 'Naval drills reported near Taiwan', { minutesAgo: 1 })))
    await waitFor(() => expect(rowFor('ev-tw')).toBeTruthy())

    fireEvent.click(rowFor('ev-tw'))

    // Globe selection/focus path.
    await waitFor(() => expect(worldState!.selectedEntity).toBe('Taiwan'))
    expect(atlasState!.selectedCountry).toBe('Taiwan')
    expect(atlasState!.selectedEvent).toBe('Naval drills reported near Taiwan')
    expect(atlasState!.openPanel).toBe('evidence')

    // Existing evidence lifecycle fetches for exactly that selection.
    await waitFor(() => expect(observationRequests).toContain('Taiwan'))
    await resolveObservation('Taiwan', TAIWAN_OBSERVATION)
    await waitFor(() => expect(atlasState!.evidence.status).toBe('ready'))
    expect(atlasState!.evidence.selection).toBe('Taiwan')
    expect(atlasState!.evidence.observation?.provenance?.provider).toBe('FEED-TW')
  })

  it('refreshes the selected evidence in place when a newer affecting event arrives', async () => {
    renderTimeline()
    const ws = worldSockets()[0]
    act(() => ws.serverOpen())
    act(() => ws.serverSend(newEventFrame('ev-tw', 'Naval drills reported near Taiwan', { minutesAgo: 2 })))
    await waitFor(() => expect(rowFor('ev-tw')).toBeTruthy())

    fireEvent.click(rowFor('ev-tw'))
    await waitFor(() => expect(observationRequests).toContain('Taiwan'))
    await resolveObservation('Taiwan', TAIWAN_OBSERVATION)
    await waitFor(() => expect(atlasState!.evidence.status).toBe('ready'))
    expect(observationRequests).toHaveLength(1)

    act(() => ws.serverSend(newEventFrame('ev-tw-2', 'Taiwan strait traffic halted', { minutesAgo: 0 })))

    // Same selection, same lifecycle — an in-place refresh, not a new path.
    await waitFor(() => expect(observationRequests).toHaveLength(2))
    expect(observationRequests[1]).toBe('Taiwan')
    expect(atlasState!.evidence.selection).toBe('Taiwan')
    expect(atlasState!.evidence.observation?.provenance?.provider).toBe('FEED-TW')
  })
})

describe('resolved events', () => {
  it('marks an existing event resolved without duplicating the entry', async () => {
    renderTimeline()
    const ws = worldSockets()[0]
    act(() => ws.serverOpen())
    act(() => ws.serverSend(newEventFrame('ev-res', 'Sanctions lifted', { minutesAgo: 1 })))
    await waitFor(() => expect(rowFor('ev-res').getAttribute('data-status')).toBe('LIVE'))

    act(() =>
      ws.serverSend({
        type: 'live_event_resolved',
        timestamp: new Date().toISOString(),
        data: { id: 'ev-res', status: 'resolved', title: 'Sanctions lifted' },
      }),
    )

    await waitFor(() => expect(rowFor('ev-res').getAttribute('data-status')).toBe('RESOLVED'))
    expect(rows().filter(row => row.getAttribute('data-event-id') === 'ev-res')).toHaveLength(1)
    expect(worldState!.events.find(event => event.id === 'ev-res')?.status).toBe('resolved')
  })

  it('ignores a resolution for an event that was never ingested', async () => {
    renderTimeline()
    const seedIds = liveRowIds()
    const ws = worldSockets()[0]
    act(() => ws.serverOpen())

    act(() =>
      ws.serverSend({
        type: 'live_event_resolved',
        timestamp: new Date().toISOString(),
        data: { id: 'never-seen', status: 'resolved' },
      }),
    )

    expect(liveRowIds()).toEqual(seedIds)
    expect(worldState!.events.some(event => event.id === 'never-seen')).toBe(false)
  })
})

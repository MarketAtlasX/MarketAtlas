import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEffect } from 'react'
import { act, render, waitFor } from '@testing-library/react'
import { WorldProvider, useWorldStore, type WorldStoreState } from '../stores/WorldStore'
import { AtlasProvider, toAtlasContextSnapshot, useAtlasStore, type AtlasState } from '../stores/AtlasStore'
import { useLiveWorldSocket } from '../services/websocket/useLiveWorldSocket'
import { useLiveEvidenceRefresh } from '../features/evidence/useLiveEvidenceRefresh'
import { answerFromEvidence } from '../features/evidence/evidenceBriefing'
import type { EvidenceObservation } from '../api/evidenceApi'

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

  serverClose() {
    this.onclose?.()
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
      // WorldStore bootstrap and anything else: empty, non-fabricating payload.
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

// ── Canonical payloads ──────────────────────────────────────────────────────

const TAIWAN_FRAME = {
  type: 'live_event_new',
  timestamp: '2026-10-01T06:01:00.000',
  data: {
    id: 'le-taiwan-1',
    title: 'Naval drills reported near Taiwan',
    description: 'Air traffic rerouted during live-fire drills.',
    event_type: 'geopolitical',
    sub_type: 'conflict',
    severity: 7.0,
    status: 'breaking',
    source: 'gdelt',
    lat: 23.8,
    lng: 121.0,
    country_code: 'TW',
    event_date: '2026-10-01T06:00:00',
    first_seen_at: '2026-10-01T06:01:00',
  },
}

const IRAN_FRAME = {
  type: 'live_event_new',
  timestamp: '2026-10-01T06:30:00.000',
  data: {
    id: 'le-iran-1',
    title: 'Iranian oil output cut announced',
    description: 'Production curbs extend through the quarter.',
    event_type: 'geopolitical',
    sub_type: 'other',
    severity: 6.0,
    status: 'breaking',
    source: 'gdelt',
    lat: 32.0,
    lng: 53.0,
    country_code: 'IR',
    event_date: '2026-10-01T06:25:00',
  },
}

const OBSERVATION_A: EvidenceObservation = {
  status: 'live',
  freshness: 'current',
  event: { title: 'Earlier Taiwan port delay reported' },
  provenance: { provider: 'FEED-A', observed_at: '2026-10-01T00:00:00Z', confidence: 0.7 },
}

const OBSERVATION_B: EvidenceObservation = {
  status: 'live',
  freshness: 'current',
  event: { title: 'Naval drills concluded' },
  provenance: { provider: 'FEED-B', observed_at: '2026-10-01T08:00:00Z', confidence: 0.72 },
}

// ── Harness (mirrors the WorldCommandCenter wiring) ─────────────────────────

let worldState: WorldStoreState | null = null
let atlasState: AtlasState | null = null

function PipelineHarness({ selection }: { selection: string | null }) {
  const { state: world, selectEntity } = useWorldStore()
  const { state: atlas } = useAtlasStore()
  const { onLiveEvent } = useLiveEvidenceRefresh(selection, { refreshIntervalMs: 0 })
  useLiveWorldSocket({ onLiveEvent })
  useEffect(() => {
    selectEntity(selection)
  }, [selection, selectEntity])
  worldState = world
  atlasState = atlas
  return null
}

function renderPipeline(selection: string | null) {
  return render(
    <WorldProvider>
      <AtlasProvider>
        <PipelineHarness selection={selection} />
      </AtlasProvider>
    </WorldProvider>,
  )
}

beforeEach(() => {
  MockWebSocket.instances = []
  MockWebSocket.failNextConstruct = false
  vi.stubGlobal('WebSocket', MockWebSocket)
  installFetchMock()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  pending.length = 0
  observationRequests.length = 0
  MockWebSocket.instances = []
  worldState = null
  atlasState = null
})

// ── Tests ───────────────────────────────────────────────────────────────────

describe('live event ingestion → world state', () => {
  it('pushes a validated backend event into the world state without a reload', async () => {
    renderPipeline(null)

    const ws = worldSockets()[0]
    act(() => ws.serverOpen())
    const channels = ws.sent.map(raw => JSON.parse(raw).channel)
    expect(channels).toEqual(expect.arrayContaining(['signals', 'events', 'risk', 'forecasts', 'live_events']))

    // Seeded events stay simulated until a genuine backend event arrives.
    expect(worldState!.dataMode).toBe('simulated')

    act(() => ws.serverSend(TAIWAN_FRAME))
    await waitFor(() => expect(worldState!.events[0].id).toBe('le-taiwan-1'))

    // Every field comes from the backend envelope — nothing invented.
    expect(worldState!.events[0]).toMatchObject({
      id: 'le-taiwan-1',
      title: 'Naval drills reported near Taiwan',
      countryCode: 'TW',
      country: 'Taiwan',
      type: 'conflict',
      severity: 7,
      lat: 23.8,
      lng: 121.0,
      timestamp: '2026-10-01T06:00:00',
      summary: 'Air traffic rerouted during live-fire drills.',
    })
    expect(worldState!.dataMode).toBe('live')
  })
})

describe('live event → selected evidence refresh', () => {
  it('refreshes the selected entity evidence in place when an event affects it', async () => {
    renderPipeline('Taiwan')
    await resolveObservation('Taiwan', OBSERVATION_A)
    await waitFor(() => expect(atlasState?.evidence.status).toBe('ready'))
    expect(observationRequests).toHaveLength(1)

    const ws = worldSockets()[0]
    act(() => ws.serverOpen())
    act(() => ws.serverSend(TAIWAN_FRAME))

    // Same selection, same lifecycle — an in-place refresh, not a new fetch path.
    await waitFor(() => expect(observationRequests).toHaveLength(2))
    expect(atlasState?.evidence.selection).toBe('Taiwan')
    expect(atlasState?.evidence.refreshing).toBe(true)
    // The previous observation stays visible while the refresh is in flight.
    expect(atlasState?.evidence.observation?.provenance?.provider).toBe('FEED-A')

    await resolveObservation('Taiwan', OBSERVATION_B)
    await waitFor(() => expect(atlasState?.evidence.observation?.provenance?.provider).toBe('FEED-B'))
    expect(atlasState?.evidence.selection).toBe('Taiwan')
    expect(atlasState?.evidence.status).toBe('ready')
  })

  it('hands the refreshed observation to ATLAS context and grounded answers', async () => {
    renderPipeline('Taiwan')
    await resolveObservation('Taiwan', OBSERVATION_A)
    await waitFor(() => expect(atlasState?.evidence.status).toBe('ready'))

    const before = toAtlasContextSnapshot(atlasState as AtlasState)
    expect(before.evidence.briefing).toContain('Earlier Taiwan port delay reported')
    expect(before.evidence.briefing).toContain('FEED-A')

    const ws = worldSockets()[0]
    act(() => ws.serverOpen())
    act(() => ws.serverSend(TAIWAN_FRAME))
    await waitFor(() => expect(observationRequests).toHaveLength(2))
    await resolveObservation('Taiwan', OBSERVATION_B)
    await waitFor(() => expect(atlasState?.evidence.observation?.provenance?.provider).toBe('FEED-B'))

    // ATLAS now sees exactly the refreshed canonical observation.
    const after = toAtlasContextSnapshot(atlasState as AtlasState)
    expect(after.evidence.briefing).toContain('Naval drills concluded')
    expect(after.evidence.briefing).toContain('FEED-B')
    expect(after.evidence.briefing).not.toContain('FEED-A')
    expect(after.latestEvidence?.source).toBe('FEED-B')
    expect(answerFromEvidence(atlasState!.evidence)).toContain('Naval drills concluded')
    expect(answerFromEvidence(atlasState!.evidence)).not.toContain('Earlier Taiwan port delay reported')
  })

  it('preserves the current selection while a non-affecting event still updates the world', async () => {
    renderPipeline('Taiwan')
    await resolveObservation('Taiwan', OBSERVATION_A)
    await waitFor(() => expect(atlasState?.evidence.status).toBe('ready'))

    const ws = worldSockets()[0]
    act(() => ws.serverOpen())

    // An event about another country must not touch Taiwan's evidence…
    act(() => ws.serverSend(IRAN_FRAME))
    await waitFor(() => expect(worldState!.events[0].id).toBe('le-iran-1'))
    expect(worldState!.events[0].country).toBe('Iran')
    expect(observationRequests).toHaveLength(1)
    expect(atlasState?.evidence.selection).toBe('Taiwan')
    expect(atlasState?.evidence.observation?.provenance?.provider).toBe('FEED-A')
    // …and neither the globe selection nor the evidence selection changes.
    expect(worldState?.selectedEntity).toBe('Taiwan')
    expect(toAtlasContextSnapshot(atlasState as AtlasState).evidence.selection).toBe('Taiwan')

    // Contrast: an event about the selected entity does refresh it.
    act(() => ws.serverSend(TAIWAN_FRAME))
    await waitFor(() => expect(observationRequests).toHaveLength(2))
    expect(atlasState?.evidence.selection).toBe('Taiwan')
    expect(worldState?.selectedEntity).toBe('Taiwan')
  })
})

describe('duplicate event handling', () => {
  it('drops replays and cross-channel duplicates of the same story', async () => {
    renderPipeline(null)
    const ws = worldSockets()[0]
    act(() => ws.serverOpen())

    // Same envelope replayed (e.g. after a reconnect)…
    act(() => ws.serverSend(TAIWAN_FRAME))
    act(() => ws.serverSend(TAIWAN_FRAME))
    // …and the same story re-broadcast on the `events` channel with a
    // different id — the backend dual-broadcasts every GDELT article.
    act(() =>
      ws.serverSend({
        type: 'event',
        timestamp: '2026-10-01T06:02:00.000',
        data: {
          id: 4242,
          title: 'Naval drills reported near Taiwan',
          source_url: 'https://example.test/drill',
          severity: 'medium',
          lat: 23.8,
          lng: 121.0,
          country_code: 'TW',
          event_date: '2026-10-01T06:00:00',
        },
      }),
    )

    await waitFor(() => expect(worldState!.events[0].id).toBe('le-taiwan-1'))
    expect(worldState!.events.filter(event => event.title === 'Naval drills reported near Taiwan')).toHaveLength(1)

    // A genuinely distinct story still passes through.
    act(() =>
      ws.serverSend({
        type: 'live_event_new',
        timestamp: '2026-10-01T07:00:00.000',
        data: {
          id: 'le-2',
          title: 'Ceasefire talks announced in Geneva',
          severity: 4,
          lat: 46.2,
          lng: 6.1,
          country_code: 'CH',
          event_date: '2026-10-01T06:55:00',
        },
      }),
    )
    await waitFor(() => expect(worldState!.events[0].id).toBe('le-2'))
  })
})

describe('malformed and unavailable event handling', () => {
  it('drops malformed frames instead of fabricating an event', async () => {
    renderPipeline(null)
    expect(worldState!.dataMode).toBe('simulated')
    const seedCount = worldState!.events.length

    const ws = worldSockets()[0]
    act(() => ws.serverOpen())

    act(() => ws.serverSend('this is not json {'))
    act(() => ws.serverSend({ type: 'live_event_new', data: { severity: 5 } })) // no id or title
    act(() =>
      // No coordinates → never placed at an invented position.
      ws.serverSend({ type: 'live_event_new', data: { id: 'bad-geo', title: 'No coordinates', severity: 5, event_date: '2026-10-01T06:00:00' } }),
    )
    act(() =>
      ws.serverSend({ type: 'live_event_new', data: { id: 'bad-time', title: 'Unparseable timestamp', severity: 5, lat: 1, lng: 2, event_date: 'never' } }),
    )
    act(() =>
      // Missing severity → magnitude is never invented.
      ws.serverSend({ type: 'live_event_new', data: { id: 'bad-sev', title: 'No severity', lat: 1, lng: 2, event_date: '2026-10-01T06:00:00' } }),
    )

    expect(worldState!.events).toHaveLength(seedCount)
    expect(worldState!.events.some(event => event.id.startsWith('bad-'))).toBe(false)
    expect(worldState!.dataMode).toBe('simulated')
  })

  it('keeps running when the backend WebSocket is unavailable', () => {
    MockWebSocket.failNextConstruct = true
    expect(() => renderPipeline(null)).not.toThrow()
    expect(worldState).not.toBeNull()
  })
})

describe('reconnect behavior', () => {
  it('reconnects with bounded backoff, resets on a healthy open, and resubscribes', async () => {
    vi.useFakeTimers()
    renderPipeline(null)
    expect(worldSockets()).toHaveLength(1)

    // Healthy open, then a drop → one retry after the base delay.
    act(() => {
      worldSockets()[0].serverOpen()
      worldSockets()[0].serverClose()
    })
    await vi.advanceTimersByTimeAsync(5000)
    expect(worldSockets()).toHaveLength(2)

    // The healthy open reset the backoff: the next drop waits 5s again.
    act(() => {
      worldSockets()[1].serverOpen()
      worldSockets()[1].serverClose()
    })
    await vi.advanceTimersByTimeAsync(5000)
    expect(worldSockets()).toHaveLength(3)

    // Every reconnect re-runs the subscription handshake.
    act(() => worldSockets()[2].serverOpen())
    expect(worldSockets()[2].sent.map(raw => JSON.parse(raw).channel)).toContain('live_events')

    // Consecutive failed attempts give up after the retry cap.
    act(() => worldSockets()[2].serverClose()) // attempts → 1
    await vi.advanceTimersByTimeAsync(5000)
    expect(worldSockets()).toHaveLength(4)
    act(() => worldSockets()[3].serverClose()) // attempts → 2
    await vi.advanceTimersByTimeAsync(10000)
    expect(worldSockets()).toHaveLength(5)
    act(() => worldSockets()[4].serverClose()) // attempts → 3
    await vi.advanceTimersByTimeAsync(15000)
    expect(worldSockets()).toHaveLength(6)
    act(() => worldSockets()[5].serverClose()) // attempts → 4
    await vi.advanceTimersByTimeAsync(20000)
    expect(worldSockets()).toHaveLength(7)
    act(() => worldSockets()[6].serverClose()) // cap reached — no further retries
    await vi.advanceTimersByTimeAsync(60000)
    expect(worldSockets()).toHaveLength(7)
  })

  it('does not reconnect after unmount', async () => {
    vi.useFakeTimers()
    const { unmount } = renderPipeline(null)
    act(() => {
      worldSockets()[0].serverOpen()
      worldSockets()[0].serverClose() // retry scheduled
    })
    unmount()
    await vi.advanceTimersByTimeAsync(60000)
    expect(worldSockets()).toHaveLength(1)
  })
})

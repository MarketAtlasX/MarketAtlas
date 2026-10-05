import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AtlasProvider, useAtlasStore, type AtlasState } from '../stores/AtlasStore'
import { useEvidenceSelection } from '../features/evidence/useEvidenceSelection'
import EvidencePanel from '../features/evidence/EvidencePanel'
import { buildEvidenceGlobeOverlay } from '../features/evidence/evidenceGlobeOverlays'
import type { EvidenceObservation } from '../api/evidenceApi'

let captured: AtlasState | null = null

function Capture() {
  const { state } = useAtlasStore()
  captured = state
  return null
}

function RefreshHarness({ selection, refreshIntervalMs = 0 }: { selection: string | null; refreshIntervalMs?: number }) {
  const { refresh } = useEvidenceSelection(selection, { refreshIntervalMs })
  const { state } = useAtlasStore()
  return <EvidencePanel evidence={state.evidence} onRefresh={refresh} />
}

function renderHarness(selection: string | null, refreshIntervalMs = 0) {
  const utils = render(
    <AtlasProvider>
      <RefreshHarness selection={selection} refreshIntervalMs={refreshIntervalMs} />
      <Capture />
    </AtlasProvider>,
  )
  const rerenderHarness = (next: string | null, interval?: number) =>
    utils.rerender(
      <AtlasProvider>
        <RefreshHarness selection={next} refreshIntervalMs={interval ?? refreshIntervalMs} />
        <Capture />
      </AtlasProvider>,
    )
  return { rerenderHarness }
}

interface PendingRequest {
  url: string
  resolve: (body: EvidenceObservation) => void
  reject: (error: Error) => void
}

const pending: PendingRequest[] = []

function installFetchMock() {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (input: RequestInfo | URL) =>
        new Promise<Response>((resolve, reject) => {
          pending.push({
            url: String(input),
            resolve: body => resolve(new Response(JSON.stringify(body), { status: 200 })),
            reject,
          })
        }),
    ),
  )
}

const liveObservation = (provider: string): EvidenceObservation => ({
  status: 'live',
  freshness: 'current',
  provenance: { provider, observed_at: '2026-10-01T00:00:00Z', confidence: 0.8 },
})

describe('live evidence update experience', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    pending.length = 0
    captured = null
  })

  it('refreshes in place, preserving the selection and current observation', async () => {
    installFetchMock()
    renderHarness('Taiwan')

    await waitFor(() => expect(pending.length).toBe(1), { timeout: 5000 })
    expect(screen.getByTestId('evidence-loading')).toBeInTheDocument()
    pending[0].resolve(liveObservation('GDELT'))
    await waitFor(() => expect(captured?.evidence.status).toBe('ready'), { timeout: 5000 })
    expect(screen.getByText('GDELT')).toBeInTheDocument()
    const signatureBefore = buildEvidenceGlobeOverlay(captured!.evidence.selection, captured!.evidence.observation).signature

    screen.getByTestId('evidence-refresh').click()
    await waitFor(() => expect(pending.length).toBe(2))

    // The panel keeps the current observation and shows a refresh indicator;
    // it does not fall back to the loading state.
    expect(captured?.evidence.selection).toBe('Taiwan')
    expect(captured?.evidence.refreshing).toBe(true)
    expect(captured?.evidence.observation?.provenance?.provider).toBe('GDELT')
    expect(screen.getByText('GDELT')).toBeInTheDocument()
    expect(screen.queryByTestId('evidence-loading')).not.toBeInTheDocument()
    expect(screen.getByTestId('evidence-refresh-state')).toHaveTextContent(/REFRESHING IN PLACE/)
    // Globe highlights remain stable while the refresh is in flight.
    expect(buildEvidenceGlobeOverlay(captured!.evidence.selection, captured!.evidence.observation).signature).toBe(signatureBefore)

    pending[1].resolve({
      status: 'stale',
      freshness: 'stale',
      provenance: { provider: 'GDELT-REFRESHED', observed_at: '2026-09-30T00:00:00Z', confidence: 0.6 },
    })
    await waitFor(() => expect(captured?.evidence.refreshing).toBe(false), { timeout: 5000 })
    expect(captured?.evidence.observation?.status).toBe('stale')
    expect(screen.getByText('GDELT-REFRESHED')).toBeInTheDocument()
    expect(captured?.evidence.lastUpdatedAt).toBeTruthy()
    // Globe overlay follows the refreshed observation.
    const signatureAfter = buildEvidenceGlobeOverlay(captured!.evidence.selection, captured!.evidence.observation).signature
    expect(signatureAfter).not.toBe(signatureBefore)
  })

  it('keeps the last good observation when a refresh fails instead of clearing it', async () => {
    installFetchMock()
    renderHarness('Iran')

    await waitFor(() => expect(pending.length).toBe(1), { timeout: 5000 })
    pending[0].resolve(liveObservation('GDELT'))
    await waitFor(() => expect(captured?.evidence.status).toBe('ready'), { timeout: 5000 })

    screen.getByTestId('evidence-refresh').click()
    await waitFor(() => expect(pending.length).toBe(2))
    pending[1].reject(new Error('network down'))

    await waitFor(() => expect(captured?.evidence.refreshing).toBe(false), { timeout: 5000 })
    // The previous observation is still shown; no fabricated update, no reset.
    expect(captured?.evidence.observation?.provenance?.provider).toBe('GDELT')
    expect(screen.getByText('GDELT')).toBeInTheDocument()
    expect(screen.queryByTestId('evidence-loading')).not.toBeInTheDocument()
    expect(screen.getByTestId('evidence-refresh-error')).toBeInTheDocument()
  })

  it('drops a stale refresh response after the selection changes', async () => {
    installFetchMock()
    const { rerenderHarness } = renderHarness('Taiwan')

    await waitFor(() => expect(pending.length).toBe(1), { timeout: 5000 })
    pending[0].resolve(liveObservation('TAIWAN-PROVIDER'))
    await waitFor(() => expect(captured?.evidence.status).toBe('ready'), { timeout: 5000 })

    // Start a refresh for Taiwan, then switch selection before it resolves.
    screen.getByTestId('evidence-refresh').click()
    await waitFor(() => expect(pending.length).toBe(2))

    rerenderHarness('Iran')
    await waitFor(() => expect(pending.length).toBe(3))
    expect(captured?.evidence.selection).toBe('Iran')
    expect(captured?.evidence.observation).toBeNull()

    // The late Taiwan refresh must not leak into the Iran selection.
    pending[1].resolve({ status: 'degraded', freshness: 'unknown', provenance: { provider: 'TAIWAN-LATE' } })
    pending[2].resolve({ status: 'live', freshness: 'current', provenance: { provider: 'IRAN-PROVIDER' } })

    await waitFor(() => expect(captured?.evidence.status).toBe('ready'), { timeout: 5000 })
    expect(captured?.evidence.selection).toBe('Iran')
    expect(captured?.evidence.observation?.provenance?.provider).toBe('IRAN-PROVIDER')
    expect(screen.queryByText('TAIWAN-LATE')).not.toBeInTheDocument()
  })

  it('reflects a status transition from live to unavailable on refresh', async () => {
    installFetchMock()
    renderHarness('Japan')

    await waitFor(() => expect(pending.length).toBe(1), { timeout: 5000 })
    pending[0].resolve(liveObservation('GDELT'))
    await waitFor(() => expect(captured?.evidence.status).toBe('ready'), { timeout: 5000 })
    expect(screen.getAllByText('LIVE').length).toBeGreaterThan(0)

    screen.getByTestId('evidence-refresh').click()
    await waitFor(() => expect(pending.length).toBe(2))
    pending[1].resolve({
      status: 'unavailable',
      freshness: 'unknown',
      provider_status: { events: 'unavailable', market_data: 'unavailable', causal_graph: 'unavailable' },
      uncertainty: ['No persisted provider-backed event matched the request.'],
      limitations: ['No persisted provider-backed event matched the request.'],
    })

    await waitFor(() => expect(captured?.evidence.observation?.status).toBe('unavailable'))
    expect(screen.getAllByText('UNAVAILABLE').length).toBeGreaterThan(0)
    // No stale evidence-driven (affected) highlights remain for an unavailable
    // observation; only the selection marker itself stays.
    const affected = buildEvidenceGlobeOverlay(captured!.evidence.selection, captured!.evidence.observation).points.filter(p => p.kind === 'affected')
    expect(affected).toHaveLength(0)
  })

  it('refreshes automatically on an interval without changing the selection', async () => {
    installFetchMock()
    // A 20ms interval races the initial fetch under load (the poll can fire
    // before the first response applies and supersede it). 300ms still
    // exercises the background refresh deterministically.
    renderHarness('Taiwan', 300)

    await waitFor(() => expect(pending.length).toBe(1), { timeout: 5000 })
    pending[0].resolve(liveObservation('GDELT'))
    await waitFor(() => expect(captured?.evidence.status).toBe('ready'), { timeout: 5000 })

    // The poll triggers a background refresh of the same selection.
    await waitFor(() => expect(pending.length).toBeGreaterThanOrEqual(2), { timeout: 5000 })
    expect(captured?.evidence.selection).toBe('Taiwan')
  })
})
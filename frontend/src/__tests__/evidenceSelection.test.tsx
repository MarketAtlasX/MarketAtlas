import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AtlasProvider, toAtlasContextSnapshot, useAtlasStore, type AtlasState } from '../stores/AtlasStore'
import { useEvidenceSelection } from '../features/evidence/useEvidenceSelection'
import EvidencePanel from '../features/evidence/EvidencePanel'

function Harness({ selection }: { selection: string | null }) {
  useEvidenceSelection(selection)
  const { state } = useAtlasStore()
  return <EvidencePanel evidence={state.evidence} />
}

let captured: AtlasState | null = null

function Capture() {
  const { state } = useAtlasStore()
  captured = state
  return null
}

function renderHarness(selection: string | null) {
  return render(
    <AtlasProvider>
      <Harness selection={selection} />
      <Capture />
    </AtlasProvider>,
  )
}

describe('useEvidenceSelection', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    captured = null
  })

  it('fetches the canonical observation for a committed selection', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ status: 'live', freshness: 'current', provenance: { provider: 'GDELT' } }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    renderHarness('Taiwan')
    expect(screen.getByTestId('evidence-loading')).toBeInTheDocument()

    await waitFor(() => expect(screen.queryByTestId('evidence-loading')).not.toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/live-events/observation')
    expect(String(fetchMock.mock.calls[0][0])).toContain('query=Taiwan')
    expect(screen.getAllByText('LIVE').length).toBeGreaterThan(0)
  })

  it('does not fetch when there is no selection', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderHarness(null)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByText(/SELECT AN EVENT OR ENTITY ON THE GLOBE/)).toBeInTheDocument()
  })

  it('surfaces a transport failure as an explicit error state', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network down')
    }))

    renderHarness('Iran')
    await waitFor(() => expect(screen.getByTestId('evidence-error')).toBeInTheDocument())
    expect(screen.getByText('network down')).toBeInTheDocument()
  })

  it('does not refetch an unchanged selection', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ status: 'live', freshness: 'current' }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { rerender } = renderHarness('Japan')
    await waitFor(() => expect(captured?.evidence.status).toBe('ready'))

    rerender(
      <AtlasProvider>
        <Harness selection="Japan" />
        <Capture />
      </AtlasProvider>,
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('drops a stale response so a previous selection never leaks into the current one', async () => {
    const pending: Array<{ url: string; resolve: (body: unknown) => void }> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (input: RequestInfo | URL) =>
          new Promise<Response>(resolve => {
            pending.push({ url: String(input), resolve: body => resolve(new Response(JSON.stringify(body), { status: 200 })) })
          }),
      ),
    )

    const { rerender } = renderHarness('Taiwan')
    await waitFor(() => expect(pending.length).toBe(1))

    rerender(
      <AtlasProvider>
        <Harness selection="Iran" />
        <Capture />
      </AtlasProvider>,
    )
    await waitFor(() => expect(pending.length).toBe(2))
    expect(pending[0].url).toContain('query=Taiwan')
    expect(pending[1].url).toContain('query=Iran')

    // The newer selection resolves first.
    pending[1].resolve({ status: 'live', freshness: 'current', provenance: { provider: 'IRAN-PROVIDER' } })
    await waitFor(() => expect(captured?.evidence.status).toBe('ready'))

    // The older selection resolves late and must be ignored.
    pending[0].resolve({ status: 'unavailable', freshness: 'unknown', provenance: { provider: 'TAIWAN-PROVIDER' } })
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(captured?.evidence.selection).toBe('Iran')
    expect(captured?.evidence.observation?.status).toBe('live')
    expect(screen.queryByText('TAIWAN-PROVIDER')).not.toBeInTheDocument()
  })

  it('clears evidence back to idle when the selection is cleared', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ status: 'live', freshness: 'current' }), { status: 200 })),
    )

    const { rerender } = renderHarness('Japan')
    await waitFor(() => expect(captured?.evidence.status).toBe('ready'))

    rerender(
      <AtlasProvider>
        <Harness selection={null} />
        <Capture />
      </AtlasProvider>,
    )
    await waitFor(() => expect(captured?.evidence.status).toBe('idle'))
    expect(captured?.evidence.observation).toBeNull()
  })

  it('exposes the same canonical evidence to ATLAS through the context snapshot', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            status: 'stale',
            freshness: 'stale',
            provenance: { provider: 'GDELT', observed_at: '2026-09-01T00:00:00Z', confidence: 0.6 },
            limitations: ['This observation came from the normalized event store and may be stale.'],
          }),
          { status: 200 },
        ),
      ),
    )

    renderHarness('Taiwan')
    await waitFor(() => expect(captured?.evidence.status).toBe('ready'))

    const snapshot = toAtlasContextSnapshot(captured as AtlasState)
    expect(snapshot.evidence.selection).toBe('Taiwan')
    expect(snapshot.evidence.observation?.status).toBe('stale')
    expect(snapshot.latestEvidence?.source).toBe('GDELT')
    expect(snapshot.latestEvidence?.status).toBe('stale')
    expect(snapshot.latestEvidence?.limitations).toHaveLength(1)
  })
})

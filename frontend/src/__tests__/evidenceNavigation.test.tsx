import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { AtlasProvider, toAtlasContextSnapshot, useAtlasStore, type AtlasState } from '../stores/AtlasStore'
import { WorldProvider, useWorldStore } from '../stores/WorldStore'
import { useEvidenceSelection } from '../features/evidence/useEvidenceSelection'
import EvidencePanel from '../features/evidence/EvidencePanel'

let captured: AtlasState | null = null

function Capture() {
  const { state } = useAtlasStore()
  captured = state
  return null
}

/**
 * Mirrors WorldCommandCenter's wiring: the committed globe selection feeds
 * `useEvidenceSelection`, and related-entity clicks go back through the same
 * `selectEntity` globe selection system.
 */
function NavigationHarness() {
  const { state: worldState, selectEntity } = useWorldStore()
  const { state: atlasState } = useAtlasStore()
  const [asked, setAsked] = useState<string | null>(null)

  useEvidenceSelection(worldState.selectedEntity)

  return (
    <>
      <button type="button" onClick={() => selectEntity('Taiwan')}>
        select-taiwan
      </button>
      <EvidencePanel evidence={atlasState.evidence} onSelectEntity={selectEntity} onAskAtlas={setAsked} />
      {asked && <span data-testid="asked">{asked}</span>}
    </>
  )
}

function renderHarness() {
  return render(
    <WorldProvider>
      <AtlasProvider>
        <NavigationHarness />
        <Capture />
      </AtlasProvider>
    </WorldProvider>,
  )
}

const pending = new Map<string, (body: unknown) => void>()

function installFetchMock() {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      const match = /[?&]query=([^&]+)/.exec(url)
      // Non-evidence requests (e.g. WorldProvider's /api/events bootstrap).
      if (!match) return Promise.resolve(new Response(JSON.stringify({ items: [] }), { status: 200 }))
      const query = decodeURIComponent(match[1])
      return new Promise<Response>(resolve => {
        pending.set(query, body => resolve(new Response(JSON.stringify(body), { status: 200 })))
      })
    }),
  )
}

function resolveQuery(query: string, body: unknown) {
  const resolve = pending.get(query)
  if (!resolve) throw new Error(`No pending evidence request for ${query}`)
  resolve(body)
}

const TAIWAN_OBSERVATION = {
  status: 'live',
  freshness: 'current',
  provenance: { provider: 'GDELT', observed_at: '2026-10-01T00:00:00Z', confidence: 0.8 },
  causal_chain: [{ source: 'Taiwan', source_type: 'geography', target: 'TSM', target_type: 'asset', confidence: 0.7 }],
}

const TSM_OBSERVATION = {
  status: 'stale',
  freshness: 'stale',
  provenance: { provider: 'TSM-PROVIDER', observed_at: '2026-09-01T00:00:00Z', confidence: 0.55 },
  limitations: ['Quoted from cache.'],
}

describe('Evidence → related-entity navigation', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    pending.clear()
    captured = null
  })

  it('loads evidence on globe selection, then navigates a related entity without leaking the previous observation', async () => {
    installFetchMock()
    renderHarness()

    fireEvent.click(screen.getByRole('button', { name: 'select-taiwan' }))
    await waitFor(() => expect(pending.has('Taiwan')).toBe(true))
    expect(screen.getByTestId('evidence-loading')).toBeInTheDocument()

    resolveQuery('Taiwan', TAIWAN_OBSERVATION)
    await waitFor(() => expect(captured?.evidence.status).toBe('ready'))
    expect(screen.getByText('GDELT')).toBeInTheDocument()

    // Click the related causal node — routed through the globe selection system.
    within(screen.getByTestId('evidence-panel')).getByRole('button', { name: 'TSM' }).click()
    await waitFor(() => expect(pending.has('TSM')).toBe(true))

    // The previous entity's evidence must not remain on screen.
    expect(captured?.evidence.selection).toBe('TSM')
    expect(captured?.evidence.observation).toBeNull()
    expect(screen.queryByText('GDELT')).not.toBeInTheDocument()
    expect(screen.getByTestId('evidence-loading')).toBeInTheDocument()

    resolveQuery('TSM', TSM_OBSERVATION)
    await waitFor(() => expect(captured?.evidence.status).toBe('ready'))
    expect(captured?.evidence.selection).toBe('TSM')
    expect(captured?.evidence.observation?.status).toBe('stale')
    expect(screen.getByText('TSM-PROVIDER')).toBeInTheDocument()
    expect(screen.queryByText('GDELT')).not.toBeInTheDocument()
  })

  it('keeps ATLAS on the currently displayed observation after navigation', async () => {
    installFetchMock()
    renderHarness()

    fireEvent.click(screen.getByRole('button', { name: 'select-taiwan' }))
    await waitFor(() => expect(pending.has('Taiwan')).toBe(true))
    resolveQuery('Taiwan', TAIWAN_OBSERVATION)
    await waitFor(() => expect(captured?.evidence.status).toBe('ready'))

    within(screen.getByTestId('evidence-panel')).getByRole('button', { name: 'TSM' }).click()
    await waitFor(() => expect(pending.has('TSM')).toBe(true))
    resolveQuery('TSM', TSM_OBSERVATION)
    await waitFor(() => expect(captured?.evidence.status).toBe('ready'))

    // ATLAS context snapshot carries the exact displayed observation, plus its
    // provenance/freshness/status — nothing stale from the previous entity.
    const snapshot = toAtlasContextSnapshot(captured as AtlasState)
    expect(snapshot.evidence.selection).toBe('TSM')
    expect(snapshot.evidence.observation?.status).toBe('stale')
    expect(snapshot.evidence.observation?.provenance?.provider).toBe('TSM-PROVIDER')
    expect(snapshot.latestEvidence?.source).toBe('TSM-PROVIDER')
    expect(snapshot.latestEvidence?.freshness).toBe('stale')
    expect(snapshot.latestEvidence?.status).toBe('stale')

    // Ask ATLAS operates on the newly selected observation.
    fireEvent.click(within(screen.getByTestId('evidence-panel')).getByRole('button', { name: /ASK ATLAS ABOUT THIS EVIDENCE/ }))
    await waitFor(() => expect(screen.getByTestId('asked')).toHaveTextContent('TSM'))
  })
})

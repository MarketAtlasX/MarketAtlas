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

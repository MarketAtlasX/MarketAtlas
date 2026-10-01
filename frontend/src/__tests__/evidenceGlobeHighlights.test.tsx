import { afterEach, describe, expect, it } from 'vitest'
import { useEffect } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WorldProvider } from '../stores/WorldStore'
import { AtlasProvider, useAtlasStore } from '../stores/AtlasStore'
import HolographicGlobe from '../features/globe/HolographicGlobe'
import type { EvidenceObservation } from '../api/evidenceApi'

const OBSERVATION: EvidenceObservation = {
  status: 'live',
  freshness: 'current',
  causal_chain: [{ source: 'Taiwan', source_type: 'geography', target: 'TSM', target_type: 'asset', confidence: 0.7 }],
}

/** Drives AtlasStore.evidence exactly as `useEvidenceSelection` would. */
function EvidenceDriver({ selection, observation }: { selection: string | null; observation: EvidenceObservation | null }) {
  const { update } = useAtlasStore()
  useEffect(() => {
    update({
      evidence: { selection, status: observation ? 'ready' : 'idle', observation, error: null },
    })
  }, [selection, observation, update])
  return null
}

function renderGlobe(selection: string | null, observation: EvidenceObservation | null) {
  const utils = render(
    <MemoryRouter>
      <WorldProvider>
        <AtlasProvider>
          <EvidenceDriver selection={selection} observation={observation} />
          <div style={{ width: 800, height: 600 }}>
            <HolographicGlobe mode="world" />
          </div>
        </AtlasProvider>
      </WorldProvider>
    </MemoryRouter>,
  )
  const globe = () => document.querySelector('.cinematic-globe') as HTMLElement
  const rerenderGlobe = (nextSelection: string | null, nextObservation: EvidenceObservation | null) =>
    utils.rerender(
      <MemoryRouter>
        <WorldProvider>
          <AtlasProvider>
            <EvidenceDriver selection={nextSelection} observation={nextObservation} />
            <div style={{ width: 800, height: 600 }}>
              <HolographicGlobe mode="world" />
            </div>
          </AtlasProvider>
        </WorldProvider>
      </MemoryRouter>,
    )
  return { globe, rerenderGlobe }
}

describe('globe reacts to the selected EvidenceObservation', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('highlights the selected evidence, then clears highlights when the selection is dropped', () => {
    const { globe, rerenderGlobe } = renderGlobe(null, null)
    expect(globe().getAttribute('data-evidence-highlights')).toBe('0')
    expect(globe().getAttribute('data-evidence-arcs')).toBe('0')

    rerenderGlobe('Taiwan', OBSERVATION)
    expect(Number(globe().getAttribute('data-evidence-highlights'))).toBeGreaterThan(0)
    expect(globe().getAttribute('data-evidence-arcs')).toBe('1')

    // Clearing the selection must remove every evidence-driven highlight.
    rerenderGlobe(null, null)
    expect(globe().getAttribute('data-evidence-highlights')).toBe('0')
    expect(globe().getAttribute('data-evidence-arcs')).toBe('0')
  })

  it('updates highlights in place when the observation refreshes for the same selection', () => {
    const { globe, rerenderGlobe } = renderGlobe('Taiwan', OBSERVATION)
    const before = globe().getAttribute('data-evidence-signature')
    expect(globe().getAttribute('data-evidence-arcs')).toBe('1')

    // Same selection, new observation (e.g. a background refresh result).
    rerenderGlobe('Taiwan', {
      status: 'stale',
      freshness: 'stale',
      causal_chain: [{ source: 'Taiwan', source_type: 'geography', target: 'Japan', target_type: 'geography', confidence: 0.5 }],
    })
    const after = globe().getAttribute('data-evidence-signature')
    expect(after).not.toBe(before)
    expect(globe().getAttribute('data-evidence-arcs')).toBe('1')
  })

  it('swaps highlights when the selection changes rather than accumulating them', () => {
    const { globe, rerenderGlobe } = renderGlobe('Taiwan', OBSERVATION)
    const taiwanSignature = globe().getAttribute('data-evidence-signature')
    expect(taiwanSignature).toBeTruthy()

    rerenderGlobe('Japan', { status: 'live', freshness: 'current' })
    const japanSignature = globe().getAttribute('data-evidence-signature')
    expect(japanSignature).toBeTruthy()
    expect(japanSignature).not.toBe(taiwanSignature)
    // The previous causal arc is gone with the previous observation.
    expect(globe().getAttribute('data-evidence-arcs')).toBe('0')
  })
})

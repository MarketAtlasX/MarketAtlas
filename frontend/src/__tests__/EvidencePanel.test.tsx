import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import EvidencePanel from '../features/evidence/EvidencePanel'
import type { EvidenceObservation } from '../api/evidenceApi'
import type { AtlasEvidenceState } from '../stores/AtlasStore'

function makeEvidence(overrides: Partial<EvidenceObservation> = {}): EvidenceObservation {
  return {
    status: 'live',
    query: 'Taiwan',
    freshness: 'current',
    ...overrides,
  }
}

function makeState(
  observation: EvidenceObservation | null,
  status: AtlasEvidenceState['status'] = 'ready',
  selection: string | null = 'Taiwan',
): AtlasEvidenceState {
  return { selection, status, observation, error: null }
}

function renderPanel(
  state: AtlasEvidenceState,
  onAskAtlas?: (selection: string) => void,
  onSelectEntity?: (entity: string) => void,
) {
  return render(<EvidencePanel evidence={state} onAskAtlas={onAskAtlas} onSelectEntity={onSelectEntity} />)
}

describe('EvidencePanel status rendering', () => {
  it('renders LIVE with provenance and freshness', () => {
    renderPanel(
      makeState(
        makeEvidence({
          provenance: { provider: 'GDELT', observed_at: '2026-10-01T12:00:00Z', confidence: 0.81, references: ['event:123'] },
        }),
      ),
    )
    const panel = within(screen.getByTestId('evidence-panel'))
    expect(panel.getAllByText('LIVE').length).toBeGreaterThan(0)
    expect(panel.getByText('GDELT')).toBeInTheDocument()
    expect(panel.getByText('CURRENT')).toBeInTheDocument()
    expect(panel.getByText('81%')).toBeInTheDocument()
    expect(panel.getByText('event:123')).toBeInTheDocument()
  })

  it('renders STALE distinctly', () => {
    renderPanel(makeState(makeEvidence({ status: 'stale', freshness: 'stale' })))
    const panel = within(screen.getByTestId('evidence-panel'))
    expect(panel.getAllByText('STALE').length).toBeGreaterThan(0)
  })

  it('renders DEGRADED distinctly', () => {
    renderPanel(makeState(makeEvidence({ status: 'degraded' })))
    const panel = within(screen.getByTestId('evidence-panel'))
    expect(panel.getAllByText('DEGRADED').length).toBeGreaterThan(0)
  })

  it('renders UNAVAILABLE without inventing an event', () => {
    renderPanel(makeState(makeEvidence({ status: 'unavailable', freshness: 'unknown', event: null })))
    const panel = within(screen.getByTestId('evidence-panel'))
    expect(panel.getAllByText('UNAVAILABLE').length).toBeGreaterThan(0)
    expect(panel.getByText('NO EVENT RECORD IN THIS OBSERVATION')).toBeInTheDocument()
  })

  it('renders DEMO distinctly', () => {
    renderPanel(makeState(makeEvidence({ status: 'demo', freshness: 'simulated' })))
    const panel = within(screen.getByTestId('evidence-panel'))
    expect(panel.getAllByText('DEMO').length).toBeGreaterThan(0)
  })
})

describe('EvidencePanel sections', () => {
  it('renders impacts and affected assets', () => {
    renderPanel(
      makeState(
        makeEvidence({
          impacts: [
            {
              id: 'impact-1',
              entity_name: 'TSMC',
              entity_type: 'company',
              impact_direction: 'negative',
              impact_score: -0.4,
              confidence: 0.77,
              analysis_summary: 'Foundry exposure to shipping disruption.',
              affected_assets: [{ ticker: 'TSM', asset_type: 'equity' }],
            },
          ],
        }),
      ),
    )
    const panel = within(screen.getByTestId('evidence-panel'))
    expect(panel.getByText('TSMC')).toBeInTheDocument()
    expect(panel.getByText('CONF 77%')).toBeInTheDocument()
    expect(panel.getByText('Foundry exposure to shipping disruption.')).toBeInTheDocument()
    expect(panel.getByText('TSM')).toBeInTheDocument()
  })

  it('renders provider-backed market observations', () => {
    renderPanel(
      makeState(
        makeEvidence({
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
          ],
        }),
      ),
    )
    const panel = within(screen.getByTestId('evidence-panel'))
    expect(panel.getByText('182.40')).toBeInTheDocument()
    expect(panel.getByText('+4.80%')).toBeInTheDocument()
    expect(panel.getByText('yfinance')).toBeInTheDocument()
  })

  it('marks unavailable market observations explicitly', () => {
    renderPanel(
      makeState(
        makeEvidence({
          market_observations: [{ symbol: 'XOM', status: 'unavailable', freshness: 'unknown' }],
        }),
      ),
    )
    const panel = within(screen.getByTestId('evidence-panel'))
    expect(panel.getByText('Market quote unavailable — no provider value was returned.')).toBeInTheDocument()
    expect(panel.getByTestId('market-observation')).toHaveAttribute('data-status', 'unavailable')
  })

  it('labels a simulated market observation as SIMULATED, never as demo', () => {
    renderPanel(
      makeState(
        makeEvidence({ market_observations: [{ symbol: 'TSM', status: 'simulated', price: 100, change_percent: 1.2, freshness: 'simulated' }] }),
      ),
    )
    const panel = within(screen.getByTestId('evidence-panel'))
    expect(panel.getByText('SIMULATED')).toBeInTheDocument()
    expect(panel.queryByText('DEMO')).not.toBeInTheDocument()
  })

  it('shows provider, freshness, and observation timestamp for a market observation', () => {
    renderPanel(
      makeState(
        makeEvidence({
          market_observations: [
            { symbol: 'TSM', status: 'provider-backed', price: 182.4, change_percent: 4.8, provider: 'yfinance', freshness: 'current', timestamp: '2026-10-01T12:00:00Z' },
          ],
        }),
      ),
    )
    const panel = within(screen.getByTestId('evidence-panel'))
    expect(panel.getByText('yfinance')).toBeInTheDocument()
    expect(panel.getByText(/CURRENT ·/)).toBeInTheDocument()
  })

  it('navigates to an affected market asset through the globe selection handler', () => {
    const onSelectEntity = vi.fn()
    renderPanel(
      makeState(
        makeEvidence({
          market_observations: [{ symbol: 'TSM', status: 'provider-backed', price: 182.4, change_percent: 4.8 }],
        }),
      ),
      undefined,
      onSelectEntity,
    )
    within(screen.getByTestId('evidence-panel')).getByTestId('market-observation-asset').click()
    expect(onSelectEntity).toHaveBeenLastCalledWith('TSM')
  })

  it('does not fabricate a value for a market observation missing its price', () => {
    renderPanel(
      makeState(
        makeEvidence({ market_observations: [{ symbol: 'TSM', status: 'cached', provider: 'yfinance' }] }),
      ),
    )
    const panel = within(screen.getByTestId('evidence-panel'))
    expect(panel.getAllByText('UNAVAILABLE').length).toBeGreaterThan(0)
    expect(panel.getByText('STALE')).toBeInTheDocument()
  })

  it('renders causal links with confidence', () => {
    renderPanel(
      makeState(
        makeEvidence({
          causal_chain: [{ source: 'Taiwan', target: 'TSM', source_type: 'geography', target_type: 'asset', confidence: 0.7 }],
        }),
      ),
    )
    const panel = within(screen.getByTestId('evidence-panel'))
    expect(panel.getAllByText('Taiwan').length).toBeGreaterThan(0)
    expect(panel.getByText('TSM')).toBeInTheDocument()
    expect(panel.getByText('70%')).toBeInTheDocument()
  })

  it('renders sources and provider status', () => {
    renderPanel(
      makeState(
        makeEvidence({
          sources: [{ reference: 'article-1', title: 'Strait tension report', provider: 'GDELT', url: 'https://example.test/a' }],
          provider_status: { events: 'live', market_data: 'unavailable' },
        }),
      ),
    )
    const panel = within(screen.getByTestId('evidence-panel'))
    expect(panel.getByText('Strait tension report')).toBeInTheDocument()
    expect(panel.getByText('OPEN SOURCE')).toBeInTheDocument()
    expect(panel.getByText(/^events$/i)).toBeInTheDocument()
    expect(panel.getByText(/^market data$/i)).toBeInTheDocument()
  })

  it('renders uncertainty and limitations', () => {
    renderPanel(
      makeState(
        makeEvidence({
          uncertainty: ['Impact relationships are analytical interpretations.'],
          limitations: ['No live-event impact or causal records matched this request.'],
        }),
      ),
    )
    const panel = within(screen.getByTestId('evidence-panel'))
    expect(panel.getByText('· Impact relationships are analytical interpretations.')).toBeInTheDocument()
    expect(panel.getByText('· No live-event impact or causal records matched this request.')).toBeInTheDocument()
  })
})

describe('EvidencePanel missing optional fields', () => {
  it('labels absent provenance, confidence, and sections as unavailable rather than fabricating values', () => {
    renderPanel(makeState(makeEvidence({ freshness: undefined, event: null })))
    const panel = within(screen.getByTestId('evidence-panel'))
    expect(panel.getAllByText('NOT PROVIDED').length).toBeGreaterThan(0)
    expect(panel.getAllByText('UNAVAILABLE').length).toBeGreaterThan(0)
    expect(panel.getByText('NO SOURCE RECORDS WERE RETURNED')).toBeInTheDocument()
    expect(panel.getByText('NO IMPACT RECORDS WERE RETURNED')).toBeInTheDocument()
    expect(panel.getByText('NO MARKET OBSERVATIONS WERE RETURNED')).toBeInTheDocument()
    expect(panel.getByText('NO CAUSAL LINKS WERE RETURNED')).toBeInTheDocument()
    expect(panel.getByText('NO PROVIDER STATUS WAS RETURNED')).toBeInTheDocument()
  })
})

describe('EvidencePanel loading, error, and empty states', () => {
  it('renders a loading state for the selection', () => {
    renderPanel({ selection: 'Taiwan', status: 'loading', observation: null, error: null })
    expect(screen.getByTestId('evidence-loading')).toBeInTheDocument()
    expect(screen.getByText(/FETCHING EVIDENCE FOR TAIWAN/)).toBeInTheDocument()
  })

  it('renders an explicit error state without fabricating evidence', () => {
    renderPanel({ selection: 'Taiwan', status: 'error', observation: null, error: 'Evidence service returned 500' })
    expect(screen.getByTestId('evidence-error')).toBeInTheDocument()
    expect(screen.getByText('Evidence service returned 500')).toBeInTheDocument()
    expect(screen.getByText(/No evidence was fabricated/)).toBeInTheDocument()
  })

  it('renders an empty prompt when nothing is selected', () => {
    renderPanel(makeState(null, 'idle', null))
    expect(screen.getByText(/SELECT AN EVENT OR ENTITY ON THE GLOBE/)).toBeInTheDocument()
  })
})

describe('EvidencePanel related-entity navigation', () => {
  it('navigates to a reliable causal node through the globe selection handler', () => {
    const onSelectEntity = vi.fn()
    renderPanel(
      makeState(
        makeEvidence({
          causal_chain: [{ source: 'Taiwan', source_type: 'geography', target: 'TSM', target_type: 'asset', confidence: 0.7 }],
        }),
      ),
      undefined,
      onSelectEntity,
    )
    const panel = within(screen.getByTestId('evidence-panel'))
    panel.getByRole('button', { name: 'Taiwan' }).click()
    expect(onSelectEntity).toHaveBeenLastCalledWith('Taiwan')
    panel.getByRole('button', { name: 'TSM' }).click()
    expect(onSelectEntity).toHaveBeenLastCalledWith('TSM')
  })

  it('leaves narrative event causal nodes inert', () => {
    const onSelectEntity = vi.fn()
    renderPanel(
      makeState(
        makeEvidence({
          causal_chain: [{ source: 'Strait incident', source_type: 'event', target: 'Taiwan', target_type: 'geography', confidence: 0.7 }],
        }),
      ),
      undefined,
      onSelectEntity,
    )
    const panel = within(screen.getByTestId('evidence-panel'))
    expect(panel.queryByRole('button', { name: 'Strait incident' })).not.toBeInTheDocument()
    panel.getByRole('button', { name: 'Taiwan' }).click()
    expect(onSelectEntity).toHaveBeenCalledWith('Taiwan')
  })

  it('does not make causal nodes clickable when no handler is provided', () => {
    renderPanel(
      makeState(
        makeEvidence({
          causal_chain: [{ source: 'Taiwan', source_type: 'geography', target: 'TSM', target_type: 'asset' }],
        }),
      ),
    )
    const panel = within(screen.getByTestId('evidence-panel'))
    expect(panel.queryByRole('button', { name: 'Taiwan' })).not.toBeInTheDocument()
  })

  it('navigates to an affected asset by its canonical ticker', () => {
    const onSelectEntity = vi.fn()
    renderPanel(
      makeState(
        makeEvidence({
          impacts: [
            { id: 'impact-1', entity_name: 'TSMC', affected_assets: [{ ticker: 'TSM', name: 'Taiwan Semiconductor' }] },
          ],
        }),
      ),
      undefined,
      onSelectEntity,
    )
    within(screen.getByTestId('evidence-panel')).getByRole('button', { name: 'TSM' }).click()
    expect(onSelectEntity).toHaveBeenCalledWith('TSM')
  })

  it('falls back to an affected asset name when no ticker is present', () => {
    const onSelectEntity = vi.fn()
    renderPanel(
      makeState(
        makeEvidence({ impacts: [{ id: 'impact-1', affected_assets: [{ name: 'Brent Crude' }] }] }),
      ),
      undefined,
      onSelectEntity,
    )
    within(screen.getByTestId('evidence-panel')).getByRole('button', { name: 'Brent Crude' }).click()
    expect(onSelectEntity).toHaveBeenCalledWith('Brent Crude')
  })
})

describe('EvidencePanel causal intelligence', () => {
  it('renders the recorded source/target, type pair, confidence, and evidence reference', () => {
    renderPanel(
      makeState(
        makeEvidence({
          causal_chain: [{ source: 'Taiwan', source_type: 'geography', target: 'TSM', target_type: 'asset', confidence: 0.7, evidence_ref: 'impact-1' }],
        }),
      ),
    )
    const panel = within(screen.getByTestId('evidence-panel'))
    const hop = panel.getByTestId('causal-hop')
    expect(within(hop).getByText('GEOGRAPHY → ASSET')).toBeInTheDocument()
    expect(within(hop).getByTestId('causal-hop-confidence')).toHaveTextContent('70%')
    expect(within(hop).getByTestId('causal-hop-evidence')).toHaveTextContent('impact-1')
    expect(panel.getByTestId('causal-chain-path')).toHaveTextContent('EVENT → IMPACT → AFFECTED ENTITY/ASSET → MARKET OBSERVATION')
    expect(panel.getByTestId('causal-chain-caveat')).toHaveTextContent(/does not establish causality/)
  })

  it('states each missing field as a limitation instead of strengthening the claim', () => {
    renderPanel(
      makeState(
        makeEvidence({ causal_chain: [{ source: 'Taiwan', source_type: 'geography', target: 'XOM', target_type: 'asset' }] }),
      ),
    )
    const hop = within(screen.getByTestId('evidence-panel')).getByTestId('causal-hop')
    expect(hop).toHaveAttribute('data-limited', 'true')
    expect(within(hop).getByTestId('causal-hop-confidence')).toHaveTextContent('CONFIDENCE NOT RECORDED')
    expect(within(hop).getByTestId('causal-hop-evidence')).toHaveTextContent('NOT RECORDED')
    expect(within(hop).getByTestId('causal-hop-no-market')).toHaveTextContent('NO MARKET OBSERVATION RECORDED')
  })

  it('links a causal asset target to the market observation in the same envelope', () => {
    const onSelectEntity = vi.fn()
    renderPanel(
      makeState(
        makeEvidence({
          causal_chain: [{ source: 'Taiwan', source_type: 'geography', target: 'TSM', target_type: 'asset', confidence: 0.7, evidence_ref: 'impact-1' }],
          market_observations: [{ symbol: 'TSM', status: 'provider-backed', price: 182.4, change_percent: 4.8 }],
        }),
      ),
      undefined,
      onSelectEntity,
    )
    const hop = within(screen.getByTestId('evidence-panel')).getByTestId('causal-hop')
    expect(within(hop).getByText('LINKED MARKET OBSERVATION')).toBeInTheDocument()
    expect(within(hop).getByText('182.40')).toBeInTheDocument()
    within(hop).getByTestId('market-observation-asset').click()
    expect(onSelectEntity).toHaveBeenLastCalledWith('TSM')
  })

  it('states that no causal chain is established when none is recorded', () => {
    renderPanel(makeState(makeEvidence({ causal_chain: [] })))
    const panel = within(screen.getByTestId('evidence-panel'))
    expect(panel.getByText('NO CAUSAL LINKS WERE RETURNED')).toBeInTheDocument()
    expect(panel.getByTestId('causal-chain-not-established')).toHaveTextContent('does not establish a causal chain')
  })
})

describe('EvidencePanel live update affordances', () => {
  it('offers an in-place refresh control and reports the last updated time', () => {
    const onRefresh = vi.fn()
    render(
      <EvidencePanel
        evidence={{ selection: 'Taiwan', status: 'ready', observation: makeEvidence(), error: null, refreshing: false, lastUpdatedAt: '2026-10-01T12:00:00Z' }}
        onRefresh={onRefresh}
      />,
    )
    const panel = within(screen.getByTestId('evidence-panel'))
    expect(panel.getByText('LAST UPDATED')).toBeInTheDocument()
    panel.getByTestId('evidence-refresh').click()
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('flags an in-place refresh without discarding the current observation', () => {
    render(
      <EvidencePanel
        evidence={{ selection: 'Taiwan', status: 'ready', observation: makeEvidence({ provenance: { provider: 'GDELT' } }), error: null, refreshing: true, lastUpdatedAt: '2026-10-01T12:00:00Z' }}
        onRefresh={() => {}}
      />,
    )
    expect(screen.getByTestId('evidence-refresh-state')).toHaveTextContent(/REFRESHING IN PLACE/)
    expect(screen.getByText('GDELT')).toBeInTheDocument()
    expect(screen.queryByTestId('evidence-loading')).not.toBeInTheDocument()
  })

  it('shows a refresh failure while keeping the displayed observation', () => {
    render(
      <EvidencePanel
        evidence={{ selection: 'Taiwan', status: 'ready', observation: makeEvidence({ provenance: { provider: 'GDELT' } }), error: 'network down', refreshing: false, lastUpdatedAt: '2026-10-01T12:00:00Z' }}
        onRefresh={() => {}}
      />,
    )
    expect(screen.getByTestId('evidence-refresh-error')).toHaveTextContent(/REFRESH FAILED/)
    expect(screen.getByText('GDELT')).toBeInTheDocument()
  })
})

describe('EvidencePanel ATLAS handoff', () => {
  it('invokes onAskAtlas with the active selection', () => {
    const onAsk = vi.fn()
    renderPanel(makeState(makeEvidence()), onAsk)
    screen.getByRole('button', { name: /ASK ATLAS ABOUT THIS EVIDENCE/ }).click()
    expect(onAsk).toHaveBeenCalledWith('Taiwan')
  })

  it('does not offer the ATLAS handoff while loading', () => {
    renderPanel({ selection: 'Taiwan', status: 'loading', observation: null, error: null })
    expect(screen.queryByRole('button', { name: /ASK ATLAS ABOUT THIS EVIDENCE/ })).not.toBeInTheDocument()
  })
})

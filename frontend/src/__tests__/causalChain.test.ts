import { describe, expect, it } from 'vitest'
import {
  buildCausalChain,
  causalNodeView,
  marketObservationForAsset,
  summarizeCausalChain,
} from '../features/evidence/causalChain'
import type { EvidenceObservation } from '../api/evidenceApi'

function observation(overrides: Partial<EvidenceObservation> = {}): EvidenceObservation {
  return { status: 'live', freshness: 'current', ...overrides }
}

describe('buildCausalChain', () => {
  it('exposes the recorded source, target, types, confidence, and evidence reference', () => {
    const view = buildCausalChain(
      observation({
        causal_chain: [
          { source: 'Taiwan', source_type: 'geography', target: 'TSM', target_type: 'asset', confidence: 0.7, evidence_ref: 'impact-1' },
        ],
        market_observations: [{ symbol: 'TSM', status: 'provider-backed', price: 182.4, change_percent: 4.8 }],
      }),
    )

    expect(view.hops).toHaveLength(1)
    const hop = view.hops[0]
    expect(hop.source).toEqual({ label: 'Taiwan', type: 'geography', entity: 'Taiwan' })
    expect(hop.target).toEqual({ label: 'TSM', type: 'asset', entity: 'TSM' })
    expect(hop.relationship).toBe('GEOGRAPHY → ASSET')
    expect(hop.confidence).toBe(0.7)
    expect(hop.evidenceRef).toBe('impact-1')
    // The terminal asset is bound to the market observation already in the envelope.
    expect(hop.market?.symbol).toBe('TSM')
    expect(hop.navigable).toBe(true)
    expect(hop.limitations).toEqual([])
  })

  it('marks a hop as limited when confidence, evidence reference, or market data is absent', () => {
    const view = buildCausalChain(
      observation({
        causal_chain: [
          { source: 'Taiwan', source_type: 'geography', target: 'XOM', target_type: 'asset' },
        ],
      }),
    )
    const hop = view.hops[0]
    expect(hop.confidence).toBeNull()
    expect(hop.evidenceRef).toBeNull()
    expect(hop.market).toBeNull()
    expect(hop.limitations).toEqual(
      expect.arrayContaining(['CONFIDENCE NOT RECORDED', 'EVIDENCE REFERENCE NOT RECORDED', 'NO MARKET OBSERVATION RECORDED FOR THIS ASSET']),
    )
    expect(summarizeCausalChain(view).limited).toBe(1)
  })

  it('never treats an unrecognized node type as a reliable relationship', () => {
    const view = buildCausalChain(
      observation({
        causal_chain: [{ source: 'Mystery', source_type: 'rumour', target: 'TSM', target_type: 'asset', confidence: 0.4 }],
      }),
    )
    const hop = view.hops[0]
    expect(hop.source.entity).toBeNull()
    expect(hop.limitations).toContain('UNRECOGNIZED SOURCE TYPE: RUMOUR')
    expect(hop.navigable).toBe(false)
  })

  it('keeps narrative event nodes inert but does not treat them as missing evidence', () => {
    const view = buildCausalChain(
      observation({
        causal_chain: [{ source: 'Strait incident', source_type: 'event', target: 'Taiwan', target_type: 'geography', confidence: 0.5 }],
      }),
    )
    const hop = view.hops[0]
    expect(hop.source.entity).toBeNull()
    expect(hop.source.type).toBe('event')
    expect(hop.limitations).not.toContain('UNRECOGNIZED SOURCE TYPE: EVENT')
  })

  it('reports an empty chain explicitly instead of inventing a relationship', () => {
    const view = buildCausalChain(observation())
    expect(view.empty).toBe(true)
    expect(view.hops).toEqual([])
    expect(view.limitations).toEqual(['No causal link was recorded in this observation.'])
  })
})

describe('market observation binding', () => {
  it('matches only the exact provider symbol', () => {
    const markets = [{ symbol: 'TSM', status: 'provider-backed' as const }]
    expect(marketObservationForAsset({ label: 'TSM', type: 'asset', entity: 'TSM' }, markets)?.symbol).toBe('TSM')
    expect(marketObservationForAsset({ label: 'TSMC', type: 'entity', entity: 'TSMC' }, markets)).toBeNull()
    expect(marketObservationForAsset({ label: null, type: 'asset', entity: null }, markets)).toBeNull()
  })
})

describe('causalNodeView', () => {
  it('lower-cases the recorded type and resolves navigability through the canonical rule', () => {
    expect(causalNodeView({ source: 'Taiwan', source_type: 'GEOGRAPHY' }, 'source')).toEqual({ label: 'Taiwan', type: 'geography', entity: 'Taiwan' })
    expect(causalNodeView({ target: 'Strait incident', target_type: 'event' }, 'target')).toEqual({ label: 'Strait incident', type: 'event', entity: null })
  })
})

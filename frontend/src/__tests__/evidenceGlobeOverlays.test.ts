import { describe, expect, it } from 'vitest'
import { buildEvidenceGlobeOverlay, EMPTY_EVIDENCE_OVERLAY, resolveEntityCoords } from '../features/evidence/evidenceGlobeOverlays'
import type { EvidenceObservation } from '../api/evidenceApi'

function observation(overrides: Partial<EvidenceObservation> = {}): EvidenceObservation {
  return { status: 'live', freshness: 'current', ...overrides }
}

describe('evidenceGlobeOverlays coordinate resolution', () => {
  it('resolves known entities and known tickers without inventing coordinates', () => {
    expect(resolveEntityCoords('Taiwan')).not.toBeNull()
    // Ticker alias resolution reuses the existing company-location mapping.
    expect(resolveEntityCoords('TSM')).not.toBeNull()
    expect(resolveEntityCoords('UNKNOWN-ENTITY-XYZ')).toBeNull()
  })
})

describe('buildEvidenceGlobeOverlay', () => {
  it('distinguishes the selected entity and ignores unrelated entities', () => {
    const overlay = buildEvidenceGlobeOverlay('Taiwan', observation())
    expect(overlay.selected?.entity).toBe('Taiwan')
    expect(overlay.points).toHaveLength(1)
    expect(overlay.points[0]).toMatchObject({ entity: 'Taiwan', kind: 'selected', color: '#ffe600' })
    // Unrelated world entities are not highlighted by evidence.
    expect(overlay.points.some(p => p.entity === 'China')).toBe(false)
  })

  it('highlights affected entities and assets that resolve, and drops those that do not', () => {
    const overlay = buildEvidenceGlobeOverlay(
      'Taiwan',
      observation({
        entities: ['Taiwan'],
        assets: ['UNKNOWN-ENTITY-XYZ'],
        impacts: [
          {
            id: 'impact-1',
            entity_name: 'Japan',
            affected_assets: [{ ticker: 'TSM' }, { ticker: 'ZZZZ-NOPE' }],
          },
        ],
      }),
    )
    const entities = overlay.points.map(p => p.entity)
    expect(entities).toContain('Taiwan')
    expect(entities).toContain('Japan')
    expect(entities).toContain('TSM')
    expect(entities).not.toContain('UNKNOWN-ENTITY-XYZ')
    expect(entities).not.toContain('ZZZZ-NOPE')
    // The selected entity is never duplicated as an affected highlight.
    expect(overlay.points.filter(p => p.entity === 'Taiwan')).toHaveLength(1)
    expect(overlay.points.find(p => p.entity === 'Japan')?.kind).toBe('affected')
  })

  it('represents causal relationships only when both sides are reliable and resolvable', () => {
    const overlay = buildEvidenceGlobeOverlay(
      'Taiwan',
      observation({
        causal_chain: [
          { source: 'Taiwan', source_type: 'geography', target: 'TSM', target_type: 'asset', confidence: 0.7 },
          // Narrative event node: not a reliable entity reference → no arc.
          { source: 'Strait incident', source_type: 'event', target: 'Japan', target_type: 'geography', confidence: 0.9 },
          // Reliable but unresolvable target → no arc.
          { source: 'Taiwan', source_type: 'geography', target: 'UNKNOWN-ENTITY-XYZ', target_type: 'asset', confidence: 0.5 },
        ],
      }),
    )
    expect(overlay.arcs).toHaveLength(1)
    expect(overlay.arcs[0]).toMatchObject({ color: '#ffb020', tone: 'gold' })
    expect(overlay.arcs[0].intensity).toBeCloseTo(0.7)
  })

  it('returns an empty overlay with no selection or observation', () => {
    expect(buildEvidenceGlobeOverlay(null, observation())).toEqual(EMPTY_EVIDENCE_OVERLAY)
    expect(buildEvidenceGlobeOverlay('Taiwan', null)).toEqual(EMPTY_EVIDENCE_OVERLAY)
  })

  it('changes its signature on selection change and empties on clear', () => {
    const taiwan = buildEvidenceGlobeOverlay('Taiwan', observation())
    const japan = buildEvidenceGlobeOverlay('Japan', observation())
    expect(taiwan.signature).not.toBe(japan.signature)
    expect(buildEvidenceGlobeOverlay(null, null).signature).toBe('')
  })
})

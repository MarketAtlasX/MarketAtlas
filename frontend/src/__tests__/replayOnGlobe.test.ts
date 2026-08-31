import { describe, expect, it } from 'vitest'
import { buildReplayIntent, decodeReplayIntent, encodeReplayIntent, modeToGlobeParam } from '../features/world-memory/replayOnGlobe'

describe('replayOnGlobe', () => {
  it('builds a replay intent from memory content', () => {
    const intent = buildReplayIntent({
      title: '2022 Ukraine Invasion',
      summary: 'Invasion triggered energy shock and grain export halt.',
      sectors: ['Energy', 'Agriculture', 'Defense'],
      events: ['Black Sea blockade', 'EU sanctions waves'],
    })

    expect(['conflict', 'risk', 'route', 'region', 'country', 'globe']).toContain(intent.mode)
    expect(intent.caption.length).toBeGreaterThan(0)
  })

  it('round-trips replay intent through the URL encoder', () => {
    const original = buildReplayIntent({
      title: '2012 Strait of Hormuz Crisis',
      summary: 'Blockade threats lifted Brent and tanker rates.',
      sectors: ['Oil', 'Shipping', 'Insurance'],
      events: ['Naval buildup', 'Strategic reserve release'],
    })

    const decoded = decodeReplayIntent(encodeReplayIntent(original))
    expect(decoded).toEqual(original)
  })

  it('maps conflict replay intents to the risk globe tab', () => {
    const intent = buildReplayIntent({
      title: 'Conflict replay',
      summary: 'Military escalation with sanctions and blockade risk.',
      sectors: ['Energy'],
      events: ['Missile strike'],
    })

    expect(['world', 'risk', 'supply', 'map']).toContain(modeToGlobeParam(intent))
  })
})

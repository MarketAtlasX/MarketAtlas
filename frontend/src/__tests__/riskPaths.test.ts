import { describe, it, expect } from 'vitest'
import { buildRiskPaths } from '../features/globe/globeData'
import type { GraphLink } from '../types'

describe('buildRiskPaths', () => {
  it('drops links below the risk threshold', () => {
    const links: GraphLink[] = [
      { source: 'Oil', target: 'NVIDIA', influence: 0.55 },
      { source: 'Oil', target: 'AAPL', influence: 0.2 },
    ]
    expect(buildRiskPaths(links)).toHaveLength(0)
  })

  it('keeps high-influence links as red paths', () => {
    const paths = buildRiskPaths([{ source: 'Oil', target: 'NVIDIA', influence: 0.85 }])
    expect(paths).toHaveLength(1)
    expect(paths[0].color).toBe('#ff4d5e')
    expect(paths[0].intensity).toBeCloseTo(0.85)
  })

  it('keeps the influence threshold at exactly 0.6', () => {
    expect(buildRiskPaths([{ source: 'Oil', target: 'NVIDIA', influence: 0.6 }])).toHaveLength(1)
    expect(buildRiskPaths([{ source: 'Oil', target: 'NVIDIA', influence: 0.59 }])).toHaveLength(0)
  })
})

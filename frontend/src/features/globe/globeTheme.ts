export interface GlobeTheme {
  globe: { base: string; emissive: string; emissiveIntensity: number; opacity: number }
  atmosphere: { color: string; altitude: number }
  grid: { color: string; visible: boolean }
  polygon: {
    stable: { cap: string; stroke: string; altitude: number }
    tension: { cap: string; stroke: string; altitude: number }
    conflict: { cap: string; stroke: string; altitude: number }
    selected: { cap: string; stroke: string; altitude: number }
    side: string
  }
  arc: {
    cyan: string[]
    gold: string[]
    red: string[]
    amber: string[]
    purple: string[]
  }
  label: { gold: string; white: string; selected: string }
  node: { maxRadius: number; altitudeOffset: number }
}

export const theme: GlobeTheme = {
  globe: {
    base: '#030508',
    emissive: '#0a1016',
    emissiveIntensity: 0.15,
    opacity: 0.92,
  },
  atmosphere: {
    color: '#8aa0b8',
    altitude: 0.06,
  },
  grid: {
    color: 'rgba(160, 180, 200, 0.06)',
    visible: true,
  },
  polygon: {
    stable: {
      cap: 'rgba(180, 200, 220, 0.05)',
      stroke: 'rgba(120, 140, 160, 0.25)',
      altitude: 0.010,
    },
    tension: {
      cap: 'rgba(245, 166, 35, 0.18)',
      stroke: 'rgba(255, 160, 64, 0.90)',
      altitude: 0.014,
    },
    conflict: {
      cap: 'rgba(255, 59, 48, 0.30)',
      stroke: 'rgba(255, 77, 94, 0.98)',
      altitude: 0.018,
    },
    selected: {
      cap: 'rgba(255, 215, 0, 0.45)',
      stroke: '#ffe600',
      altitude: 0.028,
    },
    side: 'rgba(11, 15, 19, 0.92)',
  },
  arc: {
    cyan: ['rgba(0, 229, 255, 0.25)', '#00e5ff', '#00e5ff', 'rgba(0, 229, 255, 0.25)'],
    gold: ['rgba(255, 176, 32, 0.25)', '#ffb020', '#ffa040', 'rgba(255, 176, 32, 0.25)'],
    red: ['rgba(255, 59, 48, 0.25)', '#ff3b30', '#ff4d5e', 'rgba(255, 59, 48, 0.25)'],
    amber: ['rgba(46, 230, 168, 0.25)', '#2ee6a8', '#2ee6a8', 'rgba(46, 230, 168, 0.25)'],
    purple: ['rgba(179, 89, 255, 0.25)', '#b359ff', '#b359ff', 'rgba(179, 89, 255, 0.25)'],
  },
  label: {
    gold: '#ffd54a',
    white: '#f0f4f8',
    selected: '#ffe600',
  },
  node: {
    maxRadius: 0.08,
    altitudeOffset: 0.016,
  }
}

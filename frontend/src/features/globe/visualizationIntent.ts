import type { VisualizationIntent } from '../../api/chatApi'

export type { VisualMode, VisualizationIntent } from '../../api/chatApi'

export const DEFAULT_INTENT: VisualizationIntent = {
  mode: 'globe',
  scale: 'global',
  focus: [],
  origin: null,
  destination: null,
  transition: 'particle_reform',
  camera: 'pullback',
  palette: 'ultron',
  caption: 'Global particle core online.',
}

export function createIntent(partial: Partial<VisualizationIntent>): VisualizationIntent {
  return { ...DEFAULT_INTENT, ...partial }
}

export const INTENT_CAPTION: Record<string, string> = {
  core: 'INTELLIGENCE CORE',
  globe: 'GLOBAL PARTICLE CORE',
  country: 'COUNTRY FOCUS',
  region: 'REGIONAL FIELD',
  route: 'ROUTE NETWORK',
  network: 'KNOWLEDGE WEB',
  risk: 'RISK HEATFIELD',
  conflict: 'CONFLICT FIELD',
  abstract: 'ABSTRACT REASONING',
}

import { inferVisualization } from '../../assistant/brain/inferVisualization'
import { createIntent, type VisualizationIntent } from '../globe/visualizationIntent'

export interface ReplayAnalogue {
  title: string
  summary: string
  sectors: string[]
  events: string[]
}

function normalizedReplayMode(intent: VisualizationIntent): VisualizationIntent {
  if (intent.mode === 'abstract') {
    return createIntent({
      mode: 'globe',
      scale: 'global',
      camera: 'pullback',
      transition: 'particle_reform',
      caption: 'Historical event replay',
    })
  }

  return createIntent({
    ...intent,
    caption: intent.caption || 'Historical event replay',
  })
}

export function buildReplayIntent(analogue: ReplayAnalogue): VisualizationIntent {
  const transcript = [
    analogue.title,
    analogue.summary,
    analogue.sectors.join(' '),
    analogue.events.join(' '),
  ]
    .filter(Boolean)
    .join('. ')

  return normalizedReplayMode(inferVisualization(transcript))
}

export function encodeReplayIntent(intent: VisualizationIntent): string {
  return encodeURIComponent(JSON.stringify(intent))
}

export function decodeReplayIntent(raw: string | null): VisualizationIntent | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as VisualizationIntent
    if (!parsed || typeof parsed !== 'object' || typeof parsed.mode !== 'string') return null
    return createIntent(parsed)
  } catch {
    return null
  }
}

export function modeToGlobeParam(intent: VisualizationIntent): string {
  switch (intent.mode) {
    case 'risk':
      return 'risk'
    case 'supply':
      return 'supply'
    case 'map':
      return 'map'
    case 'conflict':
      return 'risk'
    default:
      return 'world'
  }
}

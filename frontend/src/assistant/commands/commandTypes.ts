import type { VisualizationIntent } from '../../features/globe/visualizationIntent'

export type AtlasCommandType =
  | 'FOCUS_COUNTRY'
  | 'ZOOM_GLOBE'
  | 'SHOW_ROUTE'
  | 'SHOW_RISK'
  | 'SHOW_GRAPH'
  | 'OPEN_MARKET'
  | 'RUN_SIMULATION'
  | 'SEARCH_MEMORY'
  | 'HIGHLIGHT_COMPANY'
  | 'VISUALIZE'
  | 'FOCUS_REGION'
  | 'SHOW_CONFLICT'
  | 'SHOW_NETWORK'
  | 'SHOW_ABSTRACT'

export interface AtlasCommand {
  id: string
  type: AtlasCommandType
  payload: Record<string, unknown>
  timestamp: number
}

export function createCommand(type: AtlasCommandType, payload: Record<string, unknown> = {}): AtlasCommand {
  return {
    id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload,
    timestamp: Date.now(),
  }
}

export function visualizeCommand(intent: VisualizationIntent): AtlasCommand {
  return createCommand('VISUALIZE', { intent })
}

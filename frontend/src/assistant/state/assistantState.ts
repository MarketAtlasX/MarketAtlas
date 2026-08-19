export type AssistantState =
  | 'IDLE'
  | 'LISTENING'
  | 'THINKING'
  | 'SPEAKING'
  | 'NAVIGATING'
  | 'ANALYZING'
  | 'SIMULATING'
  | 'ERROR'

export type AtlasVisualMode = 'orb' | 'globe' | 'network'

export const ASSISTANT_STATE_LABEL: Record<AssistantState, string> = {
  IDLE: 'ATLAS ONLINE',
  LISTENING: 'LISTENING',
  THINKING: 'ANALYZING',
  SPEAKING: 'RESPONDING',
  NAVIGATING: 'NAVIGATING',
  ANALYZING: 'ANALYZING',
  SIMULATING: 'SIMULATION',
  ERROR: 'SYSTEM ERROR',
}

export const ASSISTANT_STATE_TONE: Record<AssistantState, string> = {
  IDLE: '#38e8ff',
  LISTENING: '#2ee6a8',
  THINKING: '#f5b941',
  SPEAKING: '#38e8ff',
  NAVIGATING: '#5f7d99',
  ANALYZING: '#f5b941',
  SIMULATING: '#9adcf0',
  ERROR: '#ff4d5e',
}

export const ASSISTANT_STATES: AssistantState[] = [
  'IDLE',
  'LISTENING',
  'THINKING',
  'SPEAKING',
  'NAVIGATING',
  'ANALYZING',
  'SIMULATING',
  'ERROR',
]

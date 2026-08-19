import { backendOnline, sendChat, type ChatResponse } from '../../api/chatApi'
import type { VisualizationIntent } from '../../features/globe/visualizationIntent'
import { createCommand, visualizeCommand, type AtlasCommand } from '../commands/commandTypes'
import { domainBrain } from './domainBrain'
import { generalAnswer } from './generalKnowledge'
import { inferVisualization } from './inferVisualization'

export interface AtlasResponse {
  text: string
  commands: AtlasCommand[]
  visualization: VisualizationIntent | null
  source: 'backend' | 'offline'
}

function focusFromIntent(intent: VisualizationIntent): string | null {
  return intent.focus?.[0] ?? intent.origin ?? null
}

function fromBackend(chat: ChatResponse, transcript: string): AtlasResponse {
  const visualization: VisualizationIntent =
    chat.visualization ?? inferVisualization(transcript)

  const commands: AtlasCommand[] = [visualizeCommand(visualization)]

  const focus = focusFromIntent(visualization)
  if (focus) {
    commands.unshift(createCommand('FOCUS_COUNTRY', { country: focus }))
  }

  return {
    text: chat.response,
    commands,
    visualization,
    source: 'backend',
  }
}

function offline(transcript: string): AtlasResponse {
  const domain = domainBrain(transcript)
  if (domain.commands.length > 0) {
    return {
      text: domain.text,
      commands: domain.commands,
      visualization: null,
      source: 'offline',
    }
  }

  const answer = generalAnswer(transcript)
  const visualization = inferVisualization(transcript)
  return {
    text: answer.text,
    commands: [visualizeCommand(visualization)],
    visualization,
    source: 'offline',
  }
}

export async function atlasBrain(transcript: string): Promise<AtlasResponse> {
  const online = await backendOnline()
  if (!online) {
    return offline(transcript)
  }
  try {
    const chat = await sendChat(transcript)
    return fromBackend(chat, transcript)
  } catch {
    return offline(transcript)
  }
}

export function atlasBrainOffline(transcript: string): AtlasResponse {
  return offline(transcript)
}

export { inferVisualization }
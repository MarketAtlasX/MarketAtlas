import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { WorldProvider } from '../stores/WorldStore'
import { AtlasProvider } from '../stores/AtlasStore'
import { AssistantStateProvider } from '../assistant/state/AssistantStateContext'
import { VoiceAssistantProvider } from '../assistant/voice/useVoiceAssistant'

export function withProviders(ui: ReactNode, initialEntries?: string[]): ReactNode {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <WorldProvider>
        <AtlasProvider>
          <AssistantStateProvider>
            <VoiceAssistantProvider>{ui}</VoiceAssistantProvider>
          </AssistantStateProvider>
        </AtlasProvider>
      </WorldProvider>
    </MemoryRouter>
  )
}
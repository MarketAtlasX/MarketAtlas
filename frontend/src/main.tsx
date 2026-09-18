import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { WorldProvider } from './stores/WorldStore'
import { AtlasProvider } from './stores/AtlasStore'
import { AssistantStateProvider } from './assistant/state/AssistantStateContext'
import { VoiceAssistantProvider } from './assistant/voice/useVoiceAssistant'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <ThemeProvider>
          <WorldProvider>
            <AtlasProvider>
              <AssistantStateProvider>
                <VoiceAssistantProvider>
                  <App />
                </VoiceAssistantProvider>
              </AssistantStateProvider>
            </AtlasProvider>
          </WorldProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
)

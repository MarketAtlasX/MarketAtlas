import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AtlasProvider } from '../stores/AtlasStore'
import { WorldProvider } from '../stores/WorldStore'
import { AssistantStateProvider } from '../assistant/state/AssistantStateContext'
import { VoiceAssistantProvider } from '../assistant/voice/useVoiceAssistant'
import { AtlasCommandHandler } from '../assistant/commands/AtlasCommandHandler'

/** Full-screen boot splash while the stored session is being validated. */
function AuthSplash() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center gap-4 bg-command">
      <div className="flex items-center gap-2.5">
        <span className="h-2.5 w-2.5 bg-[var(--accent)] pulse-dot" />
        <span className="text-[15px] font-semibold tracking-[0.22em] text-[var(--text-hi)]">
          MARKET<span className="text-[var(--accent)] text-glow">ATLAS</span>
        </span>
      </div>
      <div className="w-44 h-px overflow-hidden bg-[var(--line)]">
        <div className="h-full w-1/2 shimmer-bar" />
      </div>
      <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-[var(--text-lo)]">
        Restoring session
      </p>
    </div>
  )
}

/** Redirects unauthenticated visitors to the login page, preserving intent. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <AuthSplash />
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}

/**
 * Layout route for every signed-in surface. Scopes the world/assistant
 * providers (WebSocket bootstrap, voice, wake word) to authenticated pages so
 * public pages never start them.
 */
export default function ProtectedShell() {
  return (
    <RequireAuth>
      <WorldProvider>
        <AtlasProvider>
          <AssistantStateProvider>
            <VoiceAssistantProvider>
              <AtlasCommandHandler />
              <Outlet />

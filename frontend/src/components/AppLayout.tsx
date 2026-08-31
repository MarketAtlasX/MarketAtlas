import type { ReactNode } from 'react'
import TopStatusBar from '../features/world-command/TopStatusBar'

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="h-screen w-screen flex flex-col bg-command overflow-hidden">
      <TopStatusBar />
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  )
}

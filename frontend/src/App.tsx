import { Routes, Route, Navigate } from 'react-router-dom'
import WorldCommandCenter from './features/world-command/WorldCommandCenter'
import MarketsPage from './features/markets/MarketsPage'
import GraphPage from './features/graph-analysis/GraphPage'
import SimulatorPage from './features/scenario-simulator/SimulatorPage'
import MemoryPage from './features/world-memory/MemoryPage'
import { AtlasPage } from './assistant/AtlasPage'
import AppLayout from './components/AppLayout'
import LandingPage from './features/landing/LandingPage'
import AuthPage from './features/auth/AuthPage'
import ProtectedShell from './auth/ProtectedShell'

export default function App() {
  return (
    <Routes>
      {/* Public entryway */}
      <Route path="/" element={<LandingPage />} />

      {/* Public auth pages */}
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />

      {/* Protected workspace — all providers scoped here */}
      <Route element={<ProtectedShell />}>
        <Route path="/dashboard" element={<AppLayout><WorldCommandCenter /></AppLayout>} />
        <Route path="/markets" element={<AppLayout><MarketsPage /></AppLayout>} />
        <Route path="/graph" element={<AppLayout><GraphPage /></AppLayout>} />
        <Route path="/simulator" element={<AppLayout><SimulatorPage /></AppLayout>} />
        <Route path="/memory" element={<AppLayout><MemoryPage /></AppLayout>} />
        <Route path="/atlas" element={<AppLayout><AtlasPage /></AppLayout>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

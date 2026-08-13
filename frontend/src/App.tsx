import { Routes, Route, Navigate } from 'react-router-dom'
import WorldCommandCenter from './features/world-command/WorldCommandCenter'
import MarketsPage from './features/markets/MarketsPage'
import GraphPage from './features/graph-analysis/GraphPage'
import SimulatorPage from './features/scenario-simulator/SimulatorPage'
import MemoryPage from './features/world-memory/MemoryPage'
import { ErrorBoundary } from './components/ErrorBoundary'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<WorldCommandCenter />} />
      <Route path="/markets" element={<MarketsPage />} />
      <Route path="/graph" element={<GraphPage />} />
      <Route path="/simulator" element={<SimulatorPage />} />
      <Route path="/memory" element={<MemoryPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

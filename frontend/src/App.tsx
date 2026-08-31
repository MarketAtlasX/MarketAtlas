import { Routes, Route, Navigate } from 'react-router-dom'
import WorldCommandCenter from './features/world-command/WorldCommandCenter'
import MarketsPage from './features/markets/MarketsPage'
import GraphPage from './features/graph-analysis/GraphPage'
import SimulatorPage from './features/scenario-simulator/SimulatorPage'
import MemoryPage from './features/world-memory/MemoryPage'
import { AtlasPage } from './assistant/AtlasPage'
import { AtlasCommandHandler } from './assistant/commands/AtlasCommandHandler'
import AppLayout from './components/AppLayout'

export default function App() {
  return (
    <>
      <AtlasCommandHandler />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<AppLayout><WorldCommandCenter /></AppLayout>} />
        <Route path="/markets" element={<AppLayout><MarketsPage /></AppLayout>} />
        <Route path="/graph" element={<AppLayout><GraphPage /></AppLayout>} />
        <Route path="/simulator" element={<AppLayout><SimulatorPage /></AppLayout>} />
        <Route path="/memory" element={<AppLayout><MemoryPage /></AppLayout>} />
        <Route path="/atlas" element={<AppLayout><AtlasPage /></AppLayout>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  )
}

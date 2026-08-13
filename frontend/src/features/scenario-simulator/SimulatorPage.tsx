import SimulationView from '../../simulation/SimulationView'
import { ErrorBoundary } from '../../components/ErrorBoundary'

export default function SimulatorPage() {
  return (
    <div className="h-full flex flex-col overflow-hidden bg-command">
      <div className="shrink-0 px-4 pt-3 pb-2">
        <h1 className="text-lg font-semibold tracking-wide text-[var(--text-hi)]">SCENARIO SIMULATOR</h1>
        <p className="text-[10px] font-mono text-[var(--text-mid)]">
          COUNTERFACTUAL WORLDS — CLONE · SIMULATE · DESTROY. LIVE STATE IS NEVER MUTATED.
        </p>
      </div>
      <div className="flex-1 min-h-0 px-4 pb-4">
        <ErrorBoundary>
          <SimulationView />
        </ErrorBoundary>
      </div>
    </div>
  )
}

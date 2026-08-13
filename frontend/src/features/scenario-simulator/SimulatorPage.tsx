import { useSearchParams } from 'react-router-dom'
import SimulationView from '../../simulation/SimulationView'
import { ErrorBoundary } from '../../components/ErrorBoundary'

const SCENARIOS: Record<string, string> = {
  taiwan_escalation:
    'Taiwan Strait escalation: a naval blockade halts most TSMC foundry output for 30 days. Semiconductors, NVIDIA, Apple and global technology supply chains are directly exposed; expect a sharp global risk-off move.',
  chip_export_ban:
    'China bans advanced chip exports to the US and allies. Foundry pricing power spikes, inventory buffers shorten, and defense-focused fabs become strategic winners.',
  oil_shock:
    'A major supply disruption in the Middle East lifts Brent above $110. Energy, shipping and defense outperform while airlines, autos and consumer discretionary suffer.',
}

export default function SimulatorPage() {
  const [searchParams] = useSearchParams()
  const scenario = searchParams.get('scenario')
  const initialScenarioText = scenario && SCENARIOS[scenario] ? SCENARIOS[scenario] : ''

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
          <SimulationView initialScenarioText={initialScenarioText} />
        </ErrorBoundary>
      </div>
    </div>
  )
}

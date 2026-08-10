import { Sun, Moon, Globe, FlaskConical } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

interface HeaderProps {
  onSimulationToggle?: () => void
  simulationActive?: boolean
}

export default function Header({ onSimulationToggle, simulationActive }: HeaderProps) {
  const { theme, toggle } = useTheme()

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b dark:border-white/10 border-gray-200 dark:bg-gray-950 bg-white">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center">
          <Globe className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold dark:text-white text-gray-900 leading-tight">MarketAtlas</h1>
          <p className="text-[10px] dark:text-gray-500 text-gray-400 leading-tight">Geopolitical Trading Intelligence</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {onSimulationToggle && (
          <button
            onClick={onSimulationToggle}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              simulationActive
                ? 'bg-purple-600 text-white'
                : 'dark:hover:bg-white/10 hover:bg-gray-100 dark:text-gray-300 text-gray-600'
            }`}
            title="Scenario Simulator"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Simulator
          </button>
        )}
        <div className="flex items-center gap-2 text-xs dark:text-gray-400 text-gray-600">
          <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Live
        </div>
        <button
          onClick={toggle}
          className="p-2 rounded-lg dark:hover:bg-white/10 hover:bg-gray-100 transition-colors dark:text-gray-300 text-gray-600"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  )
}

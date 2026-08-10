import { Truck, AlertTriangle, DollarSign, ArrowRight, X, Shield, Loader2 } from 'lucide-react'
import { supplyChainPaths, getSupplyChainsForCountry } from '../data/supplyChains'
import type { SupplyChainPath, SupplyChainLink } from '../data/supplyChains'
import type { Country } from '../data/countries'

interface SupplyChainPanelProps {
  country: Country | null
  onClose?: () => void
}

function criticalityColor(c: number): string {
  if (c >= 9) return 'text-red-400 bg-red-500/20 border-red-500/30'
  if (c >= 7) return 'text-orange-400 bg-orange-500/20 border-orange-500/30'
  if (c >= 5) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
  return 'text-green-400 bg-green-500/20 border-green-500/30'
}

function riskBar(risk: number) {
  const pct = (risk / 10) * 100
  const color = risk >= 7 ? '#ef4444' : risk >= 5 ? '#f97316' : risk >= 3 ? '#eab308' : '#22c55e'
  return (
    <div className="w-full bg-white/10 rounded-full h-1.5 mt-1">
      <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

function LinkRow({ link, index }: { link: SupplyChainLink; index: number }) {
  return (
    <div className="dark:bg-gray-800/50 bg-gray-100 rounded-lg p-2.5 border-l-2 transition-colors"
      style={{ borderLeftColor: link.color }}
    >
      <div className="flex items-center gap-1.5 text-xs mb-1">
        <span className="font-semibold dark:text-white text-gray-900">{link.fromCountry}</span>
        <div className="flex items-center gap-0.5 dark:text-gray-500 text-gray-400">
          <ArrowRight size={10} />
          <span className="text-[8px] font-mono">→</span>
        </div>
        <span className="font-semibold dark:text-white text-gray-900">{link.toCountry}</span>
        <div className="ml-auto flex items-center gap-1">
          <DollarSign size={10} className="dark:text-gray-500 text-gray-400" />
          <span className="text-[10px] font-mono dark:text-gray-400 text-gray-500">{link.volume}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium dark:bg-white/10 bg-gray-200 dark:text-gray-300 text-gray-600">
          {link.commodity}
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${criticalityColor(link.criticality)}`}>
          Criticality: {link.criticality}/10
        </span>
      </div>
    </div>
  )
}

function PathCard({ path }: { path: SupplyChainPath }) {
  const riskBorder = path.risk >= 7 ? '#ef4444' : path.risk >= 5 ? '#f97316' : path.risk >= 3 ? '#eab308' : '#22c55e'
  return (
    <div className="dark:bg-gray-800/30 bg-gray-50 rounded-xl border dark:border-white/10 border-gray-200 p-3 mb-3"
      style={{ borderLeftWidth: 3, borderLeftColor: riskBorder }}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-xs font-semibold dark:text-white text-gray-900">{path.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] dark:text-gray-400 text-gray-500">
              Risk: {path.risk}/10
            </span>
            <span className="text-[10px] dark:text-gray-400 text-gray-500">
              Criticality: {path.totalCriticality}/10
            </span>
          </div>
        </div>
        <div className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
          path.risk >= 7 ? 'text-red-400 bg-red-500/20 border-red-500/30' :
          path.risk >= 5 ? 'text-orange-400 bg-orange-500/20 border-orange-500/30' :
          'text-green-400 bg-green-500/20 border-green-500/30'
        }`}>
          {path.risk >= 7 ? 'High Risk' : path.risk >= 5 ? 'Medium Risk' : 'Low Risk'}
        </div>
      </div>
      {riskBar(path.risk)}
      <div className="space-y-2 mt-3">
        {path.links.map((link, i) => (
          <LinkRow key={link.id} link={link} index={i} />
        ))}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="animate-pulse dark:bg-gray-800/30 bg-gray-100 rounded-xl p-3">
          <div className="h-3 dark:bg-gray-700 bg-gray-200 rounded w-2/3 mb-2" />
          <div className="h-2 dark:bg-gray-700 bg-gray-200 rounded w-1/3 mb-3" />
          <div className="h-1.5 dark:bg-gray-700 bg-gray-200 rounded-full mb-3" />
          <div className="space-y-2">
            <div className="h-8 dark:bg-gray-700/50 bg-gray-200 rounded" />
            <div className="h-8 dark:bg-gray-700/50 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function SupplyChainPanel({ country, onClose }: SupplyChainPanelProps) {
  const paths = country
    ? getSupplyChainsForCountry(country.code)
    : supplyChainPaths

  if (paths.length === 0) {
    return (
      <div className="p-4 text-center">
        <Truck size={24} className="mx-auto mb-2 dark:text-gray-600 text-gray-400" />
        <p className="text-xs dark:text-gray-500 text-gray-400">No supply chain data for {country?.name || 'this region'}</p>
      </div>
    )
  }

  const totalPaths = paths.length
  const avgRisk = paths.reduce((s, p) => s + p.risk, 0) / (totalPaths || 1)
  const highestCriticality = Math.max(...paths.map(p => p.totalCriticality), 0)

  const lastUpdated = new Date().toLocaleTimeString()

  return (
    <div className="flex flex-col h-full">
      {onClose && (
        <div className="flex items-center justify-between p-3 border-b dark:border-white/10 border-gray-200 bg-gradient-to-r from-transparent via-amber-500/5 to-transparent">
          <h3 className="text-xs font-semibold dark:text-gray-300 text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <Truck size={12} /> Supply Chains
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[8px] dark:text-gray-600 text-gray-400">Updated {lastUpdated}</span>
            <button onClick={onClose} className="dark:text-gray-400 text-gray-500 hover:dark:text-white hover:text-gray-700 transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {country && (
        <div className="px-3 pt-2 pb-0">
          <div className="flex items-center gap-1.5 text-[10px] dark:text-cyan-400 text-cyan-600 bg-cyan-500/10 rounded-lg px-2 py-1">
            <Shield size={10} />
            Showing paths for <span className="font-semibold">{country.name}</span>
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 px-3 pt-3 pb-1">
        <div className="dark:bg-gray-800/40 bg-gray-100 rounded-lg p-2 text-center">
          <span className="text-lg font-bold dark:text-white text-gray-900">{totalPaths}</span>
          <p className="text-[9px] dark:text-gray-500 text-gray-400">Paths</p>
        </div>
        <div className="dark:bg-gray-800/40 bg-gray-100 rounded-lg p-2 text-center">
          <span className={`text-lg font-bold ${avgRisk >= 5 ? 'text-orange-400' : 'text-green-400'}`}>
            {avgRisk.toFixed(1)}
          </span>
          <p className="text-[9px] dark:text-gray-500 text-gray-400">Avg Risk</p>
        </div>
        <div className="dark:bg-gray-800/40 bg-gray-100 rounded-lg p-2 text-center">
          <span className="text-lg font-bold text-red-400">{highestCriticality}</span>
          <p className="text-[9px] dark:text-gray-500 text-gray-400">Max Criticality</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {paths.map(path => (
          <PathCard key={path.id} path={path} />
        ))}
      </div>

      <div className="p-3 border-t dark:border-white/10 border-gray-200">
        <div className="flex items-center gap-2 text-[10px] dark:text-gray-500 text-gray-400">
          <AlertTriangle size={10} className="text-orange-400" />
          <span>Higher criticality paths shown in red — clicking links highlights on globe</span>
        </div>
      </div>
    </div>
  )
}

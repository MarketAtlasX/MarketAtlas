import { useMemo, useState, useEffect, useCallback } from 'react'
import type { Country } from '../data/countries'
import { flagFromCode } from '../data/countries'
import type { TradeRoute, MilitaryRelation, PortData } from '../data/relations'
import {
  fetchTradeRoutes, fetchMilitaryRelations, fetchPorts,
} from '../api/countryApi'
import CountryMap from './CountryMap'
import {
  ArrowLeft, Map, Activity, Sword, PackageSearch, Banknote, Ship, Loader2,
} from 'lucide-react'

interface MapViewProps {
  country: Country
  onBack: () => void
}

export default function MapView({ country, onBack }: MapViewProps) {
  const [tradeRoutes, setTradeRoutes] = useState<TradeRoute[]>([])
  const [militaryRelations, setMilitaryRelations] = useState<MilitaryRelation[]>([])
  const [ports, setPorts] = useState<PortData[]>([])
  const [loading, setLoading] = useState(true)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onBack()
  }, [onBack])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchTradeRoutes(country.code),
      fetchMilitaryRelations(country.code),
      fetchPorts(country.code),
    ]).then(([tr, mr, pr]) => {
      if (cancelled) return
      setTradeRoutes(tr)
      setMilitaryRelations(mr)
      setPorts(pr)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [country])

  return (
    <div className="h-full flex flex-col dark:bg-gray-950 bg-gray-50 overflow-y-auto">
      <div className="flex items-center gap-3 p-4 border-b dark:border-white/10 border-gray-200">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs dark:text-gray-400 text-gray-600 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Globe
        </button>
        <span className="text-[10px] dark:text-gray-500 text-gray-400">|</span>
        <span className="text-[10px] dark:text-gray-400 text-gray-500 font-mono">{country.code}</span>
      </div>

      <div className="p-4 pb-2 border-b dark:border-white/10 border-gray-200">
        <div className="flex items-center gap-4 mb-3">
          <span className="text-4xl">{flagFromCode(country.code)}</span>
          <div>
            <h1 className="text-xl font-bold dark:text-white text-gray-900">{country.name}</h1>
            <p className="text-[11px] dark:text-gray-400 text-gray-600 mt-0.5">{country.region}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="dark:bg-gray-900 bg-gray-100 rounded-lg p-2">
            <span className="dark:text-gray-400 text-gray-500 block mb-0.5">Currency</span>
            <span className="font-semibold dark:text-white text-gray-900">{country.currency} ({country.currencySymbol})</span>
          </div>
          <div className="dark:bg-gray-900 bg-gray-100 rounded-lg p-2">
            <span className="dark:text-gray-400 text-gray-500 block mb-0.5">Exchange</span>
            <span className="font-semibold dark:text-white text-gray-900">{country.stockExchange || 'N/A'}</span>
          </div>
          <div className="dark:bg-gray-900 bg-gray-100 rounded-lg p-2">
            <span className="dark:text-gray-400 text-gray-500 block mb-0.5">Market Cap</span>
            <span className="font-semibold dark:text-white text-gray-900">{country.marketCap || 'N/A'}</span>
          </div>
        </div>
      </div>

      <div className="p-4 border-b dark:border-white/10 border-gray-200">
        <h3 className="text-xs font-semibold dark:text-gray-300 text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Map size={12} /> Country Map
        </h3>
        <div className="dark:bg-gray-900 bg-gray-100 rounded-lg overflow-hidden relative" style={{ height: 420 }}>
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center dark:bg-gray-900/80 bg-gray-100/80">
              <Loader2 size={24} className="animate-spin dark:text-gray-400 text-gray-500" />
            </div>
          )}
          <CountryMap country={country} tradeRoutes={tradeRoutes} ports={ports} />
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        <div className="dark:bg-gray-900 bg-gray-100 rounded-lg p-3.5">
          <h4 className="text-xs font-semibold dark:text-gray-300 text-gray-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Activity size={12} className="text-cyan-400" /> Trade Routes
          </h4>
          {tradeRoutes.length > 0 ? (
            <div className="space-y-1.5">
              {tradeRoutes.map((r, i) => {
                const partner = r.from === country.code ? r.to : r.from
                const dir = r.from === country.code ? 'Export' : 'Import'
                return (
                  <div key={i} className="flex items-center justify-between text-xs dark:text-gray-300 text-gray-700 py-1 border-b dark:border-white/5 border-gray-200 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                        dir === 'Export' ? 'dark:bg-cyan-900/30 bg-cyan-100 dark:text-cyan-300 text-cyan-700' : 'dark:bg-blue-900/30 bg-blue-100 dark:text-blue-300 text-blue-700'
                      }`}>
                        {dir}
                      </span>
                      <span className="font-medium">{partner}</span>
                    </div>
                    <span className="font-mono text-[11px] dark:text-gray-400 text-gray-500">{r.value}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs dark:text-gray-500 text-gray-400">No major trade routes recorded</p>
          )}
        </div>

        <div className="dark:bg-gray-900 bg-gray-100 rounded-lg p-3.5">
          <h4 className="text-xs font-semibold dark:text-gray-300 text-gray-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Sword size={12} className="text-red-400" /> Military Relations
          </h4>
          {militaryRelations.length > 0 ? (
            <div className="space-y-1.5">
              {militaryRelations.map((r, i) => {
                const partner = r.countryA === country.code ? r.countryB : r.countryA
                const typeColors: Record<string, string> = {
                  alliance: 'dark:bg-green-900/30 bg-green-100 dark:text-green-300 text-green-700',
                  rivalry: 'dark:bg-red-900/30 bg-red-100 dark:text-red-300 text-red-700',
                  conflict: 'dark:bg-orange-900/30 bg-orange-100 dark:text-orange-300 text-orange-700',
                  neutral: 'dark:bg-gray-700/30 bg-gray-200 dark:text-gray-300 text-gray-600',
                }
                return (
                  <div key={i} className="flex items-center justify-between text-xs dark:text-gray-300 text-gray-700 py-1 border-b dark:border-white/5 border-gray-200 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${typeColors[r.type]}`}>
                        {r.type.toUpperCase()}
                      </span>
                      <span className="font-medium">{partner}</span>
                    </div>
                    <span className="text-[10px] dark:text-gray-400 text-gray-500">{r.label}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs dark:text-gray-500 text-gray-400">No military relations data</p>
          )}
        </div>

        <div className="dark:bg-gray-900 bg-gray-100 rounded-lg p-3.5">
          <h4 className="text-xs font-semibold dark:text-gray-300 text-gray-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <PackageSearch size={12} className="text-amber-400" /> Commodities
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {country.commodities.map((c, i) => (
              <span key={i} className="text-[10px] dark:bg-amber-900/25 bg-amber-100 dark:text-amber-300 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                {c}
              </span>
            ))}
          </div>
        </div>

        <div className="dark:bg-gray-900 bg-gray-100 rounded-lg p-3.5">
          <h4 className="text-xs font-semibold dark:text-gray-300 text-gray-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Banknote size={12} className="text-emerald-400" /> Currency
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="dark:bg-gray-800 bg-gray-200/50 rounded p-2">
              <span className="dark:text-gray-400 text-gray-500 block">Code</span>
              <span className="font-mono font-semibold dark:text-white text-gray-900">{country.currency}</span>
            </div>
            <div className="dark:bg-gray-800 bg-gray-200/50 rounded p-2">
              <span className="dark:text-gray-400 text-gray-500 block">Symbol</span>
              <span className="font-mono font-semibold dark:text-white text-gray-900">{country.currencySymbol}</span>
            </div>
          </div>
        </div>

        <div className="dark:bg-gray-900 bg-gray-100 rounded-lg p-3.5">
          <h4 className="text-xs font-semibold dark:text-gray-300 text-gray-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Ship size={12} className="text-blue-400" /> Ports
          </h4>
          {ports.length > 0 ? (
            <div className="space-y-1.5">
              {ports.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs dark:text-gray-300 text-gray-700 py-1 border-b dark:border-white/5 border-gray-200 last:border-0">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    p.volume === 'major' ? 'bg-blue-400' : p.volume === 'medium' ? 'bg-blue-500/60' : 'bg-blue-500/30'
                  }`} />
                  <span className="font-medium">{p.name}</span>
                  <span className={`text-[9px] ml-auto ${
                    p.volume === 'major' ? 'dark:text-blue-300 text-blue-700' : 'dark:text-gray-500 text-gray-400'
                  }`}>
                    {p.volume.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs dark:text-gray-500 text-gray-400">No major ports recorded</p>
          )}
        </div>
      </div>
    </div>
  )
}

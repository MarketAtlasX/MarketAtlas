import { useEffect, useState, useCallback } from 'react'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, ShieldCheck, BarChart3, Wifi, WifiOff } from 'lucide-react'
import type { AnalysisResult } from '../api/client'
import { analyze } from '../api/client'
import type { Country } from '../data/countries'
import { useWebSocket } from '../hooks/useWebSocket'

const impactLabels = ['Very Low', 'Low', 'Moderate', 'High', 'Critical']

function getImpactLabel(risk: number) {
  return impactLabels[Math.min(Math.floor(risk * 5), 4)]
}

interface Props {
  country?: Country | null
}

export default function SignalDashboard({ country }: Props) {
  const [data, setData] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [wsSignal, setWsSignal] = useState<AnalysisResult | null>(null)

  const handleSignal = useCallback((msg: any) => {
    if (msg.data) {
      setWsSignal(msg.data as AnalysisResult)
    }
  }, [])

  const { connected } = useWebSocket({ signal: handleSignal })

  const liveData = wsSignal || data

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const symbol = country?.tickers?.[0] || 'SPY'
      const result = await analyze(`Market sentiment analysis for ${country?.name || 'global'} market`, symbol)
      setData(result)
      setLoading(false)
    }
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [country])

  if (loading || !liveData) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  const { snapshot, impact, recommendation } = liveData

  const actionColors = {
    BUY: 'bg-green-500/20 text-green-400 border-green-500/30',
    HOLD: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    SELL: 'bg-red-500/20 text-red-400 border-red-500/30',
  }

  const actionIcons = {
    BUY: TrendingUp,
    HOLD: Minus,
    SELL: TrendingDown,
  }

  const ActionIcon = actionIcons[recommendation.action]

  return (
    <div className="space-y-4">
      {/* Live indicator */}
      <div className="flex items-center justify-end gap-1.5 -mb-2">
        <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-yellow-500'}`} />
        <span className="text-[10px] dark:text-gray-500 text-gray-400">
          {connected ? 'Live' : 'Polling'}
        </span>
        {connected ? <Wifi className="w-3 h-3 text-green-400" /> : <WifiOff className="w-3 h-3 text-yellow-500" />}
      </div>
      {/* Recommendation Card */}
      <div className={`rounded-xl border p-4 ${actionColors[recommendation.action]}`}>
        <div className="flex items-center gap-3 mb-2">
          <ActionIcon className="w-8 h-8" />
          <div>
            <div className="text-2xl font-bold">{recommendation.action}</div>
            <div className="text-xs opacity-80">{snapshot.symbol}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-lg font-semibold">{(recommendation.confidence * 100).toFixed(0)}%</div>
            <div className="text-xs opacity-70">Confidence</div>
          </div>
        </div>
        <p className="text-sm opacity-80">{recommendation.reason}</p>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="dark:bg-white/5 bg-gray-100 rounded-xl p-3 border dark:border-white/10 border-gray-200">
          <div className="flex items-center gap-2 text-xs dark:text-gray-400 text-gray-600 mb-1">
            <BarChart3 className="w-3.5 h-3.5" />
            Momentum
          </div>
          <div className={`text-lg font-semibold ${snapshot.momentum >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {(snapshot.momentum * 100).toFixed(1)}%
          </div>
        </div>
        <div className="dark:bg-white/5 bg-gray-100 rounded-xl p-3 border dark:border-white/10 border-gray-200">
          <div className="flex items-center gap-2 text-xs dark:text-gray-400 text-gray-600 mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Volatility
          </div>
          <div className="text-lg font-semibold dark:text-white text-gray-900">
            {(snapshot.volatility * 100).toFixed(1)}%
          </div>
        </div>
        <div className="dark:bg-white/5 bg-gray-100 rounded-xl p-3 border dark:border-white/10 border-gray-200">
          <div className="flex items-center gap-2 text-xs dark:text-gray-400 text-gray-600 mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Volume
          </div>
          <div className="text-lg font-semibold dark:text-white text-gray-900 capitalize">
            {snapshot.volume_status}
          </div>
        </div>
      </div>

      {/* Impact */}
      <div className="dark:bg-white/5 bg-gray-100 rounded-xl p-3 border dark:border-white/10 border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs dark:text-gray-400 text-gray-600">Geopolitical Risk</span>
          <span className="text-xs font-medium">{getImpactLabel(impact.composite_risk)}</span>
        </div>
        <div className="w-full dark:bg-white/10 bg-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${impact.composite_risk * 100}%`,
              background: impact.composite_risk > 0.7
                ? 'linear-gradient(90deg, #ff4444, #ff8800)'
                : impact.composite_risk > 0.4
                  ? 'linear-gradient(90deg, #ffaa00, #ffdd00)'
                  : 'linear-gradient(90deg, #00ff88, #00d4ff)',
            }}
          />
        </div>
        <div className="flex justify-between text-xs dark:text-gray-500 text-gray-400 mt-1">
          <span>Entities: {impact.entity_count}</span>
          <span>Severity: {(impact.local_severity * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  )
}

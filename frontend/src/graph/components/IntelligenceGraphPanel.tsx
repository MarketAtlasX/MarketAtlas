import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  GraphViewType,
} from '../types/graphTypes'
import type {
  ForecastGraph as ForecastGraphType,
  CausalGraph as CausalGraphType,
  ReasoningGraph as ReasoningGraphType,
  ConfidenceGraph as ConfidenceGraphType,
} from '../types/graphTypes'
import { useGraphData } from '../hooks/useGraphData'
import { useGraphSocket } from '../hooks/useGraphSocket'
import ForecastGraphView from './ForecastGraph'
import CausalGraphView from './CausalGraph'
import ReasoningGraphView from './ReasoningGraph'
import ConfidenceGraphView from './ConfidenceGraph'

interface Props {
  symbol?: string
  companyName?: string
  currentPrice?: number
  rootEvent?: string
  targetAsset?: string
  useRealtime?: boolean
}

const TABS: { key: GraphViewType; label: string; icon: string }[] = [
  { key: 'forecast', label: 'Forecast', icon: '📈' },
  { key: 'causal', label: 'Causal', icon: '🔗' },
  { key: 'reasoning', label: 'Reasoning', icon: '🧠' },
  { key: 'confidence', label: 'Confidence', icon: '🎯' },
]

export default function IntelligenceGraphPanel({
  symbol = 'NVDA',
  companyName = 'NVIDIA Corporation',
  currentPrice = 880.0,
  rootEvent = 'Iran Conflict',
  targetAsset = 'NVIDIA',
  useRealtime = false,
}: Props) {
  const [activeTab, setActiveTab] = useState<GraphViewType>('causal')
  const [forecastData, setForecastData] = useState<ForecastGraphType | null>(null)
  const [causalData, setCausalData] = useState<CausalGraphType | null>(null)
  const [reasoningData, setReasoningData] = useState<ReasoningGraphType | null>(null)
  const [confidenceData, setConfidenceData] = useState<ConfidenceGraphType | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const graphParams = { symbol, company_name: companyName, current_price: currentPrice, root_event: rootEvent, target_asset: targetAsset }

  const { data: causalResp } = useGraphData('causal', { root_event: rootEvent, target_asset: targetAsset, max_paths: 5 })
  const { data: reasoningResp } = useGraphData('reasoning', { target: targetAsset })
  const { data: confidenceResp } = useGraphData('confidence', { target: targetAsset, prediction_direction: 'bullish' })
  const { data: forecastResp } = useGraphData('forecast', { symbol, company_name: companyName, current_price: currentPrice })

  const ws = useGraphSocket({
    forecast: (msg) => { setForecastData((msg.data as any)?.forecast ?? null) },
    causal: (msg) => { setCausalData((msg.data as any) ?? null) },
    reasoning: (msg) => { setReasoningData((msg.data as any) ?? null) },
    confidence: (msg) => { setConfidenceData((msg.data as any) ?? null) },
    all_graphs: (msg) => {
      const d = msg.data as Record<string, any> ?? {}
      if (d.forecast?.forecast) setForecastData(d.forecast.forecast)
      if (d.causal) setCausalData(d.causal)
      if (d.reasoning) setReasoningData(d.reasoning)
      if (d.confidence) setConfidenceData(d.confidence)
    },
  })

  useEffect(() => {
    if (useRealtime) {
      ws.requestAll(graphParams as any)
      setLastUpdated(new Date().toLocaleTimeString())
      refreshTimerRef.current = setInterval(() => {
        ws.requestAll(graphParams as any)
        setLastUpdated(new Date().toLocaleTimeString())
      }, 30000)
      return () => {
        if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
      }
    }
  }, [useRealtime, symbol, currentPrice, rootEvent, targetAsset])

  useEffect(() => {
    if (forecastResp) {
      const d = forecastResp as any
      setForecastData(d.forecast ?? d)
    }
  }, [forecastResp])

  useEffect(() => {
    if (causalResp) {
      const d = causalResp as any
      setCausalData(d.causal ?? d)
    }
  }, [causalResp])

  useEffect(() => {
    if (reasoningResp) {
      const d = reasoningResp as any
      setReasoningData(d.reasoning ?? d)
    }
  }, [reasoningResp])

  useEffect(() => {
    if (confidenceResp) {
      const d = confidenceResp as any
      setConfidenceData(d.confidence ?? d)
    }
  }, [confidenceResp])

  const handleRefresh = useCallback(() => {
    if (useRealtime) {
      ws.requestAll(graphParams as any)
      setLastUpdated(new Date().toLocaleTimeString())
    }
  }, [useRealtime, ws, graphParams])

  const handleTabChange = useCallback((tab: GraphViewType) => {
    setActiveTab(tab)
  }, [])

  return (
    <div className="flex flex-col h-full bg-gray-900/40 backdrop-blur-sm rounded-xl border border-gray-700/30 overflow-hidden">
      <div className="flex items-center border-b border-gray-700/30 px-2">
        <div className="flex-1 flex">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 relative group ${
                activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {ws.connected && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" title="Graph Engine Connected" />
          )}
          {lastUpdated && (
            <span className="text-[9px] text-gray-500 font-mono">{lastUpdated}</span>
          )}
          <button
            onClick={handleRefresh}
            className="px-2 py-1 text-[10px] text-gray-400 hover:text-white transition-colors"
            title="Refresh graphs"
          >
            ↻
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className={`absolute inset-0 ${activeTab === 'forecast' ? '' : 'hidden'}`}>
          <ForecastGraphView data={forecastData} />
        </div>
        <div className={`absolute inset-0 ${activeTab === 'causal' ? '' : 'hidden'}`}>
          <CausalGraphView data={causalData} />
        </div>
        <div className={`absolute inset-0 ${activeTab === 'reasoning' ? '' : 'hidden'}`}>
          <ReasoningGraphView data={reasoningData} />
        </div>
        <div className={`absolute inset-0 ${activeTab === 'confidence' ? '' : 'hidden'}`}>
          <ConfidenceGraphView data={confidenceData} />
        </div>
      </div>
    </div>
  )
}

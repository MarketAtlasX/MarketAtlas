import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowDown, TrendingUp, ChevronRight, Search, Activity } from 'lucide-react'
import { useWorldStore } from '../../stores/WorldStore'
import { getPrediction, type PredictionResult } from '../../api/client'
import ForecastChart from './ForecastChart'
import Panel from '../../components/ui/Panel'
import ProgressBar from '../../components/ui/ProgressBar'
import Badge from '../../components/ui/Badge'
import { fetchCanonicalCausalSubgraph, type CanonicalCausalSubgraph } from '../prediction-space/causalGraphApi'
import { fetchMarketHistory, fetchMarketObservation, type MarketHistoryObservation, type MarketObservation } from '../../api/marketDataApi'

const WATCHLIST = ['NVDA', 'TSMC', 'XOM', 'SHEL', 'AAPL', 'GC']

const SECTOR_TO_SYMBOL: Record<string, string> = {
  semiconductors: 'NVDA',
  semiconductor: 'NVDA',
  chip: 'NVDA',
  energy: 'XOM',
  oil: 'XOM',
  gold: 'GC',
  technology: 'NVDA',
  tech: 'NVDA',
}

function MarketStats({ observation, prediction }: { observation: MarketObservation; prediction: PredictionResult | null }) {
  return (
    <Panel title={`MARKET OBSERVATION · ${observation.symbol}`} corners>
      <div className="space-y-2 text-[10px] font-mono">
        <div className="flex justify-between"><span className="text-[var(--text-mid)]">Status</span><span className={observation.status === 'provider-backed' ? 'text-[var(--positive)]' : 'text-[var(--warning)]'}>{observation.status.toUpperCase()}</span></div>
        <div className="flex justify-between"><span className="text-[var(--text-mid)]">Provider</span><span className="text-[var(--text-hi)]">{observation.provider ?? 'UNKNOWN'}</span></div>
        <div className="flex justify-between"><span className="text-[var(--text-mid)]">Observed</span><span className="text-[var(--text-hi)]">{observation.timestamp ?? 'UNKNOWN'}</span></div>
        <div className="flex justify-between"><span className="text-[var(--text-mid)]">Last move</span><span className={observation.changePercent == null ? 'text-[var(--text-lo)]' : observation.changePercent >= 0 ? 'text-[var(--positive)]' : 'text-[var(--critical)]'}>{observation.changePercent == null ? 'UNAVAILABLE' : `${observation.changePercent >= 0 ? '+' : ''}${observation.changePercent.toFixed(2)}%`}</span></div>
        <div className="flex justify-between"><span className="text-[var(--text-mid)]">Currency</span><span className="text-[var(--text-hi)]">{observation.currency ?? 'UNKNOWN'}</span></div>
        {prediction && <div className="flex justify-between"><span className="text-[var(--text-mid)]">Model forecast</span><span className="text-[var(--warning)]">{prediction.direction} · {Math.round(prediction.confidence * 100)}%</span></div>}
      </div>
      <div className="mt-4">
        <p className="text-[9px] text-[var(--text-lo)] leading-relaxed">Observed market data and model inference are shown separately.</p>
      </div>
    </Panel>
  )
}

function CausalChain({ symbol }: { symbol: string }) {
  const [graph, setGraph] = useState<CanonicalCausalSubgraph | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    setGraph(null)
    void fetchCanonicalCausalSubgraph(symbol, controller.signal).then(setGraph).catch(() => setGraph({ status: 'unavailable', nodes: [], edges: [], evidence: [], limitations: ['Canonical causal graph unavailable.'] }))
    return () => controller.abort()
  }, [symbol])

  const nodeLabels = new Map((graph?.nodes ?? []).map(node => [String(node.id), String(node.label)]))
  const chain = graph?.edges.flatMap(edge => [nodeLabels.get(edge.source), nodeLabels.get(edge.target)]).filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index) ?? []
  return (
    <Panel title="WHY?" corners>
      {graph?.status !== 'supported' ? (
        <p className="text-[10px] text-[var(--text-lo)]">{graph?.limitations?.[0] ?? 'Loading canonical evidence...'}</p>
      ) : <div className="flex flex-col">
        {chain.map((node, i) => (
          <div key={node} className="flex flex-col items-center">
            <span
              className={`rounded border px-3 py-1 text-[11px] font-medium ${
                i === 0
                  ? 'border-[rgba(255,77,94,0.4)] bg-[rgba(255,77,94,0.08)] text-[var(--critical)]'
                  : i === chain.length - 1
                    ? 'border-[rgba(56,232,255,0.4)] bg-[rgba(56,232,255,0.08)] text-[var(--accent)]'
                    : 'border-[var(--line)] bg-[rgba(11,22,33,0.5)] text-[var(--text-mid)]'
              }`}
            >
              {node}
            </span>
            {i < chain.length - 1 && <ArrowDown size={13} className="my-1 text-[var(--text-lo)]" />}
          </div>
        ))}
      </div>}
    </Panel>
  )
}

export default function MarketsPage() {
  const { state } = useWorldStore()
  const [searchParams] = useSearchParams()
  const requestedSymbol = useMemo(() => {
    const raw = (searchParams.get('symbol') ?? '').toUpperCase()
    const sector = (searchParams.get('sector') ?? '').toLowerCase()
    if (raw && WATCHLIST.includes(raw)) return raw
    if (sector && SECTOR_TO_SYMBOL[sector]) return SECTOR_TO_SYMBOL[sector]
    return null
  }, [searchParams])
  const [symbol, setSymbol] = useState(requestedSymbol ?? 'NVDA')
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [predictionState, setPredictionState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [marketObservation, setMarketObservation] = useState<MarketObservation>({ symbol: symbol, assetType: 'equity', price: null, change: null, changePercent: null, timestamp: null, provider: null, freshness: 'unknown', status: 'unavailable' })
  const [marketHistory, setMarketHistory] = useState<MarketHistoryObservation | null>(null)

  useEffect(() => {
    if (requestedSymbol) setSymbol(requestedSymbol)
  }, [requestedSymbol])

  useEffect(() => {
    let active = true
    setPredictionState('loading')
    setPrediction(null)
    getPrediction(symbol)
      .then(result => {
        if (active) {
          setPrediction(result)
          setPredictionState('ready')
        }
      })
      .catch(() => {
        if (active) setPredictionState('error')
      })
    return () => {
      active = false
    }
  }, [symbol])

  useEffect(() => {
    const controller = new AbortController()
    setMarketObservation({ symbol, assetType: 'equity', price: null, change: null, changePercent: null, timestamp: null, provider: null, freshness: 'unknown', status: 'unavailable' })
    setMarketHistory(null)
    void Promise.all([fetchMarketObservation(symbol, controller.signal), fetchMarketHistory(symbol, 'daily', controller.signal)])
      .then(([quote, history]) => { if (!controller.signal.aborted) { setMarketObservation(quote); setMarketHistory(history) } })
    return () => controller.abort()
  }, [symbol])

  const history = useMemo(() => (marketHistory?.history ?? []).slice().reverse().map(row => row.close), [marketHistory])
  const price = marketObservation.price
  const signal = state.signals.find(s => s.symbol === symbol)
  const directionLabel = prediction?.direction ?? null

  return (
    <div className="h-full flex flex-col p-5 gap-4 overflow-y-auto bg-command">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity size={14} className="text-[var(--accent)]" />
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--accent)]">Market intelligence</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-hi)]">Markets</h1>
          <p className="text-[11px] text-[var(--text-mid)] mt-1">Cross-asset outlook, geopolitical exposure and scenario risk</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 border border-[var(--line)] bg-[var(--bg-raised)] px-3 py-2 text-[11px] text-[var(--text-lo)]">
            <Search size={13} />
            <span>Search symbol</span>
            <span className="ml-4 font-mono text-[9px]">/</span>
          </div>
          <div className="flex gap-1 border-l border-[var(--line)] pl-2">
          {WATCHLIST.map(s => (
            <button
              key={s}
              onClick={() => setSymbol(s)}
              className={`border px-2.5 py-2 text-[11px] font-mono transition-colors ${
                symbol === s
                  ? 'border-[rgba(56,232,255,0.4)] bg-[rgba(56,232,255,0.12)] text-[var(--accent)]'
                  : 'border-[var(--line)] text-[var(--text-mid)] hover:text-[var(--text-hi)]'
              }`}
            >
              {s}
            </button>
          ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px border border-[var(--line)] bg-[var(--line)]">
        {[
          ['Risk regime', prediction?.direction ?? 'UNAVAILABLE', prediction?.direction === 'BEARISH' ? 'var(--critical)' : prediction ? 'var(--accent)' : 'var(--text-lo)'],
          ['Last price', price == null ? 'UNAVAILABLE' : `$${price.toFixed(2)}${marketObservation.currency && marketObservation.currency !== 'USD' ? ` ${marketObservation.currency}` : ''}`, 'var(--text-hi)'],
          ['Observed move', marketObservation.changePercent == null ? 'UNAVAILABLE' : `${marketObservation.changePercent >= 0 ? '+' : ''}${marketObservation.changePercent.toFixed(2)}%`, marketObservation.changePercent != null && marketObservation.changePercent >= 0 ? 'var(--positive)' : 'var(--critical)'],
          ['Horizon', prediction?.time_horizon ?? '30-DAY', 'var(--text-mid)'],
        ].map(([label, value, color]) => (
          <div key={label} className="bg-[var(--bg-raised)] px-4 py-3">
            <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--text-lo)]">{label}</div>
            <div className="mt-1 text-sm font-semibold" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 shrink-0">
        <Panel
          title={`${symbol} · ${prediction ? directionLabel : 'FORECAST'}`}
          right={
            signal && directionLabel ? (
              <Badge tone={prediction?.direction === 'BEARISH' ? 'critical' : 'positive'}>
                {prediction?.direction === 'BEARISH' ? <ArrowDown size={10} /> : <TrendingUp size={10} />}
                {directionLabel}
              </Badge>
            ) : undefined
          }
          className="xl:col-span-2 flex flex-col min-h-[420px]"
        >
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-mono text-3xl font-semibold text-[var(--text-hi)]">{price == null ? 'UNAVAILABLE' : `$${price.toFixed(2)}${marketObservation.currency && marketObservation.currency !== 'USD' ? ` ${marketObservation.currency}` : ''}`}</span>
            <span className="font-mono text-[11px] text-[var(--text-lo)]">{marketObservation.provider ?? 'NO PROVIDER'} · {marketObservation.timestamp ?? 'NO TIMESTAMP'}</span>
          </div>
          <div className="flex-1 min-h-0">
            {history.length > 0 ? <ForecastChart symbol={symbol} history={history} bull={[]} base={[]} bear={[]} /> : <div className="flex h-full items-center justify-center text-xs text-[var(--text-lo)]">Historical market data unavailable.</div>}
          </div>
        </Panel>

        <div className="flex flex-col gap-3">
          <MarketStats observation={marketObservation} prediction={prediction} />
          <Panel title="ANALYST OUTLOOK" corners>
            {predictionState === 'loading' && <p className="text-xs text-[var(--text-mid)]">Running historical and geopolitical agents...</p>}
            {predictionState === 'error' && <p className="text-xs text-[var(--critical)]">Prediction service unavailable. Check backend and agent health.</p>}
            {prediction && (
              <div className="space-y-3">
                <p className="text-xs leading-relaxed text-[var(--text-mid)]">{prediction.prediction}</p>
                <p className="text-[10px] leading-relaxed text-[var(--text-lo)]">{prediction.reasoning_summary}</p>
                <div className="space-y-1.5">
                  {prediction.alternative_scenarios.slice(0, 3).map(scenario => (
                    <div key={scenario.scenario_name} className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="text-[var(--text-mid)]">{scenario.scenario_name}</span>
                      <span className="font-mono text-[var(--accent)]">{Math.round(scenario.probability * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        </div>
      </div>

      <div className="flex items-center justify-between px-1 pb-1 border-b border-[var(--line)]">
        <span className="panel-title flex items-center gap-1">
          <ChevronRight size={11} /> CAUSAL CHAIN — WHY IS THIS MOVING
        </span>
        <span className="text-[9px] font-mono text-[var(--text-lo)]">HOVER THE GRAPH → OPEN REASONING GRAPH IN /GRAPH</span>
      </div>
      <CausalChain symbol={symbol} />
    </div>
  )
}

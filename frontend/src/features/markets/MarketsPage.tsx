import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowDown, TrendingUp, ChevronRight } from 'lucide-react'
import { useWorldStore } from '../../stores/WorldStore'
import ForecastChart, { generateSymbolData } from './ForecastChart'
import Panel from '../../components/ui/Panel'
import ProgressBar from '../../components/ui/ProgressBar'
import Badge from '../../components/ui/Badge'

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

const CAUSAL: Record<string, string[]> = {
  NVDA: ['Taiwan', 'TSMC', 'Chip supply', 'AI demand', 'NVIDIA'],
  TSMC: ['Taiwan', 'Strait risk', 'Chip supply', 'Foundry output', 'TSMC'],
  XOM: ['Iran', 'Oil', 'Energy', 'Refining margins', 'XOM'],
  SHEL: ['Iran', 'Oil', 'LNG', 'European energy', 'SHEL'],
  AAPL: ['Taiwan', 'TSMC', 'Chip supply', 'Device demand', 'AAPL'],
  GC: ['Iran', 'Geopolitical risk', 'Risk-off flows', 'Real yields', 'Gold'],
}

function ForecastStats({ symbol, data, confidence }: { symbol: string; data: ReturnType<typeof generateSymbolData>; confidence: number }) {
  const last = data.history[data.history.length - 1]
  const lastBase = data.base[data.base.length - 1]
  const lastBull = data.bull[data.bull.length - 1]
  const lastBear = data.bear[data.bear.length - 1]
  const pct = (a: number, b: number) => ((a - b) / b) * 100
  const rows = [
    { label: 'Bull', value: pct(lastBull, last), color: 'var(--positive)' },
    { label: 'Base', value: pct(lastBase, last), color: '#f5b941' },
    { label: 'Bear', value: pct(lastBear, last), color: 'var(--critical)' },
  ]

  return (
    <Panel title={`FORECAST · ${symbol}`} corners>
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.label} className="flex items-center gap-3">
            <span className="w-10 text-[10px] uppercase tracking-wider text-[var(--text-mid)]">{r.label}</span>
            <span className="font-mono text-sm font-semibold" style={{ color: r.color }}>
              {r.value > 0 ? '+' : ''}
              {r.value.toFixed(1)}%
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-[rgba(95,125,153,0.12)] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, Math.abs(r.value) * 2.5)}%`,
                  background: r.color,
                  boxShadow: `0 0 8px ${r.color}44`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-mid)]">Confidence</span>
          <span className="font-mono text-[11px] text-[var(--accent)]">{confidence}%</span>
        </div>
        <ProgressBar value={confidence} color="var(--accent)" shimmer />
        <p className="text-[9px] text-[var(--text-lo)] mt-1.5 leading-relaxed">
          Derived from world-state propagation, supply-chain graph and agent consensus.
        </p>
      </div>
    </Panel>
  )
}

function CausalChain({ symbol }: { symbol: string }) {
  const chain = CAUSAL[symbol] ?? CAUSAL.NVDA
  return (
    <Panel title="WHY?" corners>
      <div className="flex flex-col">
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
      </div>
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

  useEffect(() => {
    if (requestedSymbol) setSymbol(requestedSymbol)
  }, [requestedSymbol])

  const data = useMemo(() => generateSymbolData(symbol), [symbol])
  const price = data.history[data.history.length - 1]
  const confidence = symbol === 'NVDA' ? state.forecast.confidence : 74 + (symbol.charCodeAt(0) % 9)
  const signal = state.signals.find(s => s.symbol === symbol)

  return (
    <div className="h-full flex flex-col p-4 gap-3 overflow-y-auto bg-command">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-wide text-[var(--text-hi)]">MARKETS</h1>
          <p className="text-[10px] font-mono text-[var(--text-mid)]">FORECASTS DERIVED FROM WORLD-STATE PROPAGATION</p>
        </div>
        <div className="flex gap-1.5">
          {WATCHLIST.map(s => (
            <button
              key={s}
              onClick={() => setSymbol(s)}
              className={`rounded border px-2.5 py-1 text-[11px] font-mono transition-colors ${
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 flex-1 min-h-0">
        <Panel
          title={`${symbol} · ${signal?.name ?? 'FORECAST'}`}
          right={
            signal ? (
              <Badge tone={signal.direction === 'UP' ? 'positive' : 'critical'}>
                {signal.direction === 'UP' ? <TrendingUp size={10} /> : <ArrowDown size={10} />}
                {signal.changePct > 0 ? '+' : ''}
                {signal.changePct.toFixed(1)}%
              </Badge>
            ) : undefined
          }
          className="xl:col-span-2 flex flex-col"
        >
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-mono text-3xl font-bold text-[var(--text-hi)]">${price.toFixed(2)}</span>
            <span className="font-mono text-[11px] text-[var(--text-lo)]">USD · 30-DAY HORIZON</span>
          </div>
          <div className="flex-1 min-h-0">
            <ForecastChart symbol={symbol} history={data.history} bull={data.bull} base={data.base} bear={data.bear} />
          </div>
        </Panel>

        <div className="flex flex-col gap-3">
          <ForecastStats symbol={symbol} data={data} confidence={confidence} />
        </div>
      </div>

      <div className="flex items-center justify-between px-1 pb-1">
        <span className="panel-title flex items-center gap-1">
          <ChevronRight size={11} /> CAUSAL CHAIN — WHY IS THIS MOVING
        </span>
        <span className="text-[9px] font-mono text-[var(--text-lo)]">HOVER THE GRAPH → OPEN REASONING GRAPH IN /GRAPH</span>
      </div>
      <CausalChain symbol={symbol} />
    </div>
  )
}

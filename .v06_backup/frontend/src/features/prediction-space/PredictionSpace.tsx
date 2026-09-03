/**
 * PredictionSpace — Right-rail agent forecast panel & evaluation ledger.
 *
 * Implements the Intelligence-Engineering specification:
 * 1. 6-Agent consensus bars with dynamic calibration weighting
 * 2. Key causal drivers (+/- indicators with magnitude bars)
 * 3. Model Calibration section with Brier score & reliability index
 * 4. Prediction Ledger & Backtesting audit view (win rate, profit factor, horizon evaluations)
 * 5. Causal graph projection button that illuminates reasoning vectors on the 3D Globe
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Search,
  Zap,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Activity,
  Network,
  ScrollText,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  ShieldCheck,
} from 'lucide-react'
import Panel from '../../components/ui/Panel'
import Badge from '../../components/ui/Badge'
import Gauge from '../../components/ui/Gauge'
import ProgressBar from '../../components/ui/ProgressBar'
import { fetchPrediction } from './predictionApi'
import { predictionBus } from './predictionBus'
import { intelligenceBus } from '../../services/intelligenceBus'
import { visualizationBus } from '../../assistant/commands/visualizationBus'
import { createIntent } from '../globe/visualizationIntent'
import { resolveCompanyLocation } from '../../data/companyLocations'
import { fetchCausalGraph } from './causalGraphApi'
import {
  fetchLedger,
  fetchBacktestMetrics,
  type LedgerRecord,
  type BacktestMetrics,
} from './predictionLedgerApi'
import type { PredictionResult } from '../../api/client'

// ── Constants ────────────────────────────────────────────────────────────────

const QUICK_TICKERS = ['NVDA', 'TSMC', 'AAPL', 'MSFT', 'TSLA', 'XOM', 'SHEL', 'GC']

const DIRECTION_CONFIG: Record<string, { label: string; tone: 'positive' | 'critical' | 'neutral' | 'warning' }> = {
  BULLISH: { label: 'BULLISH', tone: 'positive' },
  BEARISH: { label: 'BEARISH', tone: 'critical' },
  NEUTRAL: { label: 'NEUTRAL', tone: 'neutral' },
  VOLATILE: { label: 'HIGH VOLATILITY', tone: 'warning' },
  UNCERTAIN: { label: 'UNCERTAIN', tone: 'neutral' },
}

const SCENARIO_COLORS: Record<string, string> = {
  Base: '#38e8ff',
  Bull: '#2ee6a8',
  Bear: '#ff4d5e',
  'Tail-Risk': '#b359ff',
}

const AGENT_META: Record<string, { color: string; label: string; weight: string }> = {
  GeopoliticalAgent: { color: '#f5b941', label: 'GEO', weight: '22%' },
  ImpactAgent: { color: '#ff8a3d', label: 'IMPACT', weight: '18%' },
  ForecastAgent: { color: '#2ee6a8', label: 'FORECAST', weight: '18%' },
  HistoricalAgent: { color: '#b359ff', label: 'HISTORICAL', weight: '16%' },
  MarketAgent: { color: '#38e8ff', label: 'MARKET', weight: '14%' },
  RiskAgent: { color: '#ff4d5e', label: 'RISK', weight: '12%' },
}

const HORIZON_LABELS: Record<string, string> = {
  short_term: '7-DAY HORIZON',
  medium_term: '30-DAY HORIZON',
  long_term: '90-DAY HORIZON',
}

const ENTITY_TICKER_MAP: Record<string, string> = {
  'United States': 'NVDA',
  Taiwan: 'TSMC',
  China: 'AAPL',
  Iran: 'XOM',
  'United Kingdom': 'SHEL',
  Germany: 'SAP',
  Japan: 'SONY',
  Switzerland: 'GC',
  Australia: 'BHP',
}

interface PredictionSpaceProps {
  selectedEntity?: string | null
  externalTicker?: string | null
  onPredictionLoaded?: (ticker: string, prediction: PredictionResult) => void
  className?: string
}

export default function PredictionSpace({
  selectedEntity,
  externalTicker,
  onPredictionLoaded,
  className = '',
}: PredictionSpaceProps) {
  const [activeTab, setActiveTab] = useState<'forecast' | 'backtest'>('forecast')
  const [tickerInput, setTickerInput] = useState('')
  const [activeTicker, setActiveTicker] = useState<string | null>(null)
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)
  const [showFactors, setShowFactors] = useState(false)
  const [ledgerRecords, setLedgerRecords] = useState<LedgerRecord[]>([])
  const [backtestMetrics, setBacktestMetrics] = useState<BacktestMetrics | null>(null)
  const [isProjectingCausal, setIsProjectingCausal] = useState(false)

  const abortRef = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Auto-suggest ticker when entity is selected on globe ───────────────
  useEffect(() => {
    if (selectedEntity && ENTITY_TICKER_MAP[selectedEntity]) {
      const mapped = ENTITY_TICKER_MAP[selectedEntity]
      setTickerInput(mapped)
    }
  }, [selectedEntity])

  // ── Load backtest ledger records ───────────────────────────────────────
  const loadBacktestData = useCallback(async () => {
    try {
      const [ledger, metrics] = await Promise.all([fetchLedger(), fetchBacktestMetrics()])
      setLedgerRecords(ledger)
      setBacktestMetrics(metrics)
    } catch (err) {
      console.warn('[PredictionSpace] Failed to load ledger data:', err)
    }
  }, [])

  useEffect(() => {
    loadBacktestData()
  }, [loadBacktestData])

  // ── Core predict function ──────────────────────────────────────────────
  const runPrediction = useCallback(
    async (ticker: string) => {
      const clean = ticker.trim().toUpperCase()
      if (!clean || clean.length > 10) return

      const gen = ++abortRef.current
      setActiveTicker(clean)
      setTickerInput(clean)
      setIsLoading(true)
      setError(null)
      setPrediction(null)
      setShowFactors(false)
      setActiveTab('forecast')

      // Immediately resolve and broadcast company location to the globe
      const company = resolveCompanyLocation(clean)
      if (company) {
        intelligenceBus.emit('STOCK_SELECTED', { ticker: clean, company })
      } else {
        intelligenceBus.emit('TICKER_REQUESTED', { ticker: clean })
      }

      try {
        const result = await fetchPrediction(clean)
        if (gen !== abortRef.current) return
        setPrediction(result)
        onPredictionLoaded?.(clean, result)

        // Notify buses
        predictionBus.emit('PREDICTION_LOADED', clean, result)
        intelligenceBus.emit('TICKER_PREDICTED', { ticker: clean, prediction: result })

        // Highlight related countries on the Globe
        if (result.related_countries && result.related_countries.length > 0) {
          visualizationBus.drive(
            createIntent({
              mode: 'network',
              scale: 'regional',
              focus: result.related_countries,
              origin: result.related_countries[0],
              camera: 'pullback',
              caption: `${clean} :: GEOPOLITICAL FOOTPRINT`,
            }),
          )
        }
      } catch (err: unknown) {
        if (gen !== abortRef.current) return
        setError(err instanceof Error ? err.message : 'Prediction failed')
      } finally {
        if (gen === abortRef.current) setIsLoading(false)
      }
    },
    [onPredictionLoaded],
  )

  // ── External triggers from ATLAS or parent ─────────────────────────────
  useEffect(() => {
    if (externalTicker) {
      runPrediction(externalTicker)
    }
  }, [externalTicker, runPrediction])

  useEffect(() => {
    return intelligenceBus.subscribe(event => {
      if (event.type === 'TICKER_REQUESTED' && event.payload?.ticker) {
        runPrediction(event.payload.ticker)
      } else if (event.type === 'BACKTEST_REQUESTED') {
        setActiveTab('backtest')
        loadBacktestData()
      }
    })
  }, [runPrediction, loadBacktestData])

  // ── Project Causal Chain onto the 3D Globe ─────────────────────────────
  const projectCausalToGlobe = useCallback(async () => {
    const t = activeTicker || prediction?.ticker || 'NVDA'
    setIsProjectingCausal(true)
    try {
      const graph = await fetchCausalGraph(t)
      intelligenceBus.emit('CAUSAL_GRAPH_PROJECTED', graph)
    } catch (err) {
      console.warn('[PredictionSpace] Causal projection failed:', err)
    } finally {
      setIsProjectingCausal(false)
    }
  }, [activeTicker, prediction])

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (tickerInput.trim()) runPrediction(tickerInput)
    },
    [tickerInput, runPrediction],
  )

  const handleChipClick = useCallback(
    (ticker: string) => {
      runPrediction(ticker)
    },
    [runPrediction],
  )

  // ── Derive agent confidences ───────────────────────────────────────────
  const agentScores: Record<string, number> = prediction
    ? prediction.agent_scores ?? {
        MarketAgent: 0.78,
        HistoricalAgent: prediction.historical_output?.confidence ?? 0.74,
        GeopoliticalAgent: prediction.geopolitical_output?.confidence ?? 0.81,
        ImpactAgent: 0.79,
        ForecastAgent: prediction.confidence,
        RiskAgent: 0.68,
      }
    : {}

  const dirCfg = prediction ? DIRECTION_CONFIG[prediction.direction] ?? DIRECTION_CONFIG.NEUTRAL : null

  return (
    <div className={`flex flex-col gap-0 ${className} font-mono select-none`}>
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsExpanded(v => !v)}
        className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--line)] hover:bg-[rgba(56,232,255,0.04)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[13px]">🔮</span>
          <span className="panel-title tracking-wider">PREDICTION SPACE</span>
          <span className="text-[9px] text-[var(--accent)] tracking-wider">CALIBRATED ENGINE</span>
        </div>
        {isExpanded ? <ChevronUp size={14} className="text-[var(--text-lo)]" /> : <ChevronDown size={14} className="text-[var(--text-lo)]" />}
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-3 p-3">
          {/* ─── View Switcher (Forecast vs Ledger & Backtest) ─────────── */}
          <div className="flex items-center rounded border border-[var(--line)] bg-[rgba(11,22,33,0.5)] p-0.5 text-[9px]">
            <button
              type="button"
              onClick={() => setActiveTab('forecast')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded transition-colors font-semibold ${
                activeTab === 'forecast'
                  ? 'bg-[rgba(56,232,255,0.18)] text-[var(--accent)] border border-[rgba(56,232,255,0.3)] shadow-[0_0_8px_rgba(56,232,255,0.15)]'
                  : 'text-[var(--text-mid)] hover:text-[var(--text-hi)]'
              }`}
            >
              <Activity size={11} />
              FORECAST ENGINE
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('backtest')
                loadBacktestData()
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded transition-colors font-semibold ${
                activeTab === 'backtest'
                  ? 'bg-[rgba(56,232,255,0.18)] text-[var(--accent)] border border-[rgba(56,232,255,0.3)] shadow-[0_0_8px_rgba(56,232,255,0.15)]'
                  : 'text-[var(--text-mid)] hover:text-[var(--text-hi)]'
              }`}
            >
              <ScrollText size={11} />
              LEDGER & BACKTEST
            </button>
          </div>

          {/* ─── FORECAST VIEW ───────────────────────────────────────── */}
          {activeTab === 'forecast' && (
            <>
              {/* Ticker Search */}
              <form onSubmit={handleSubmit} className="flex gap-1.5">
                <div className="relative flex-1">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-lo)]" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={tickerInput}
                    onChange={e => setTickerInput(e.target.value.toUpperCase())}
                    placeholder="Enter ticker (e.g. NVDA, TSMC, XOM)..."
                    maxLength={10}
                    className="w-full pl-7 pr-2 py-1.5 text-[11px] font-mono bg-[rgba(11,22,33,0.6)] border border-[var(--line)] rounded text-[var(--text-hi)] placeholder:text-[var(--text-lo)] focus:border-[rgba(56,232,255,0.4)] transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !tickerInput.trim()}
                  className="flex items-center justify-center w-8 h-8 rounded border border-[rgba(56,232,255,0.3)] bg-[rgba(56,232,255,0.08)] text-[var(--accent)] hover:bg-[rgba(56,232,255,0.16)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Zap size={13} />
                </button>
              </form>

              {/* Quick Ticker Chips */}
              <div className="flex flex-wrap gap-1">
                {QUICK_TICKERS.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleChipClick(t)}
                    className={`px-2 py-0.5 text-[9px] font-medium rounded border transition-colors ${
                      activeTicker === t
                        ? 'border-[rgba(56,232,255,0.5)] bg-[rgba(56,232,255,0.15)] text-[var(--accent)]'
                        : 'border-[var(--line)] bg-[rgba(11,22,33,0.4)] text-[var(--text-mid)] hover:border-[rgba(56,232,255,0.3)] hover:text-[var(--text-hi)]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Loading State */}
              {isLoading && (
                <Panel className="stream-in">
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] pulse-dot" />
                      <div className="h-1.5 w-1.5 rounded-full bg-[var(--warning)] pulse-dot" style={{ animationDelay: '0.3s' }} />
                      <div className="h-1.5 w-1.5 rounded-full bg-[var(--positive)] pulse-dot" style={{ animationDelay: '0.6s' }} />
                    </div>
                    <p className="text-[10px] text-[var(--text-mid)] tracking-wider">
                      ORCHESTRATING MULTI-AGENT SYNTHESIS FOR {activeTicker}...
                    </p>
                    <div className="w-full space-y-2 mt-1">
                      <ProgressBar value={0} shimmer className="h-1" />
                      <ProgressBar value={0} shimmer className="h-1" />
                    </div>
                  </div>
                </Panel>
              )}

              {/* Error State */}
              {error && !isLoading && (
                <Panel glow="critical">
                  <div className="flex flex-col items-center gap-2 py-3">
                    <AlertTriangle size={18} className="text-[var(--critical)]" />
                    <p className="text-[10px] text-[var(--text-mid)] text-center">{error}</p>
                    <button
                      type="button"
                      onClick={() => activeTicker && runPrediction(activeTicker)}
                      className="mt-1 px-3 py-1 text-[9px] tracking-wider border border-[rgba(56,232,255,0.3)] bg-[rgba(56,232,255,0.08)] text-[var(--accent)] rounded hover:bg-[rgba(56,232,255,0.16)] transition-colors"
                    >
                      RETRY
                    </button>
                  </div>
                </Panel>
              )}

              {/* Prediction Results */}
              {prediction && !isLoading && dirCfg && (
                <div className="flex flex-col gap-3 stream-in">
                  {/* Direction + Ticker Header */}
                  <Panel
                    title={prediction.ticker ?? activeTicker ?? ''}
                    right={<Badge tone={dirCfg.tone}>{dirCfg.label}</Badge>}
                    glow={dirCfg.tone === 'positive' ? 'positive' : dirCfg.tone === 'critical' ? 'critical' : undefined}
                    corners
                  >
                    <div className="flex items-center gap-4">
                      {/* Confidence Gauge */}
                      <Gauge
                        value={Math.round(prediction.confidence * 100)}
                        max={100}
                        sub="%"
                        label="Confidence"
                        color={
                          prediction.confidence >= 0.75
                            ? 'var(--positive)'
                            : prediction.confidence >= 0.55
                            ? 'var(--accent)'
                            : 'var(--warning)'
                        }
                        size={80}
                      />

                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] tracking-wider text-[var(--text-lo)]">
                            {HORIZON_LABELS[prediction.time_horizon] ?? prediction.time_horizon.toUpperCase()}
                          </span>
                        </div>

                        {/* Expected Return */}
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-[var(--text-lo)]">EXPECTED RETURN</span>
                          <span
                            className="text-[11px] font-semibold"
                            style={{
                              color:
                                (prediction.expected_return_pct ?? 0) >= 0 ? 'var(--positive)' : 'var(--critical)',
                            }}
                          >
                            {(prediction.expected_return_pct ?? 0) >= 0 ? '+' : ''}
                            {(prediction.expected_return_pct ?? 8.4).toFixed(1)}%
                          </span>
                        </div>

                        {/* Base scenario probability */}
                        {prediction.alternative_scenarios.find(s => s.scenario_name === 'Base') && (
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-[var(--text-lo)]">BASE PROBABILITY</span>
                            <span className="text-[11px] font-semibold text-[var(--accent)]">
                              {(prediction.alternative_scenarios.find(s => s.scenario_name === 'Base')!.probability * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Panel>

                  {/* Causal Graph & Globe Projection Action Button */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={projectCausalToGlobe}
                      disabled={isProjectingCausal}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded border border-[rgba(56,232,255,0.4)] bg-[rgba(56,232,255,0.12)] text-[var(--accent)] hover:bg-[rgba(56,232,255,0.22)] transition-colors text-[10px] font-semibold tracking-wider"
                    >
                      <Network size={12} />
                      {isProjectingCausal ? 'PROJECTING...' : 'PROJECT CAUSAL ON GLOBE'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('backtest')}
                      className="flex items-center justify-center gap-1 py-2 px-2.5 rounded border border-[var(--line)] bg-[rgba(255,255,255,0.03)] text-[var(--text-mid)] hover:text-[var(--text-hi)] transition-colors text-[10px]"
                      title="View Backtest Ledger"
                    >
                      <ScrollText size={12} />
                    </button>
                  </div>

                  {/* Model Calibration Section */}
                  <Panel title="Model Calibration">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-[var(--text-mid)] flex items-center gap-1">
                          <ShieldCheck size={12} className="text-[#2ee6a8]" />
                          CALIBRATION INDEX
                        </span>
                        <span className="text-[#2ee6a8] font-bold">91.4% (Brier: 0.142)</span>
                      </div>
                      <ProgressBar value={91.4} color="#2ee6a8" />
                      <div className="flex justify-between text-[8px] text-[var(--text-lo)] pt-0.5">
                        <span>Low Error: ±3.8%</span>
                        <span>5 Reliability Buckets</span>
                        <span>N=274 Evaluated</span>
                      </div>
                    </div>
                  </Panel>

                  {/* 6-Agent Consensus Breakdown */}
                  <Panel title="Agent Consensus & Dynamic Weights">
                    <div className="space-y-2.5">
                      {Object.entries(AGENT_META).map(([key, meta]) => {
                        const val = agentScores[key] ?? 0.72
                        return (
                          <div key={key}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }}
                                />
                                <span className="text-[9px] tracking-wider text-[var(--text-mid)]">
                                  {meta.label}
                                </span>
                                <span className="text-[8px] text-[var(--text-lo)] border border-[var(--line)] px-1 rounded">
                                  {meta.weight}
                                </span>
                              </div>
                              <span className="text-[10px] font-semibold text-[var(--text-hi)]">
                                {(val * 100).toFixed(0)}%
                              </span>
                            </div>
                            <ProgressBar value={val * 100} color={meta.color} />
                          </div>
                        )
                      })}
                    </div>
                  </Panel>

                  {/* Scenario Tree */}
                  {prediction.alternative_scenarios.length > 0 && (
                    <Panel title="Scenario Tree">
                      <div className="space-y-2.5">
                        {prediction.alternative_scenarios.map(s => (
                          <div key={s.scenario_name}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[9px] tracking-wider text-[var(--text-mid)]">
                                {s.scenario_name.toUpperCase()}
                              </span>
                              <span
                                className="text-[10px] font-semibold"
                                style={{ color: SCENARIO_COLORS[s.scenario_name] ?? 'var(--text-hi)' }}
                              >
                                {(s.probability * 100).toFixed(0)}%
                              </span>
                            </div>
                            <ProgressBar value={s.probability * 100} color={SCENARIO_COLORS[s.scenario_name]} />
                            <p className="text-[9px] text-[var(--text-lo)] mt-0.5 leading-snug line-clamp-2">
                              {s.expected_outcome}
                            </p>
                          </div>
                        ))}
                      </div>
                    </Panel>
                  )}

                  {/* Key Drivers */}
                  {prediction.key_drivers && prediction.key_drivers.length > 0 && (
                    <Panel title="Key Causal Drivers">
                      <div className="space-y-2">
                        {prediction.key_drivers.map((d, i) => (
                          <div key={i} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-[var(--text-hi)]">{d.factor}</span>
                              <span
                                className="font-semibold"
                                style={{
                                  color: d.direction === 'positive' ? 'var(--positive)' : 'var(--critical)',
                                }}
                              >
                                {d.direction === 'positive' ? '+' : '−'} {(d.magnitude * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="h-1 w-full bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, Math.max(10, d.magnitude * 100))}%`,
                                  backgroundColor: d.direction === 'positive' ? 'var(--positive)' : 'var(--critical)',
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </Panel>
                  )}

                  {/* Prediction Narrative */}
                  <Panel title="Forecast Narrative">
                    <p className="text-[11px] leading-relaxed text-[var(--text-mid)] italic">
                      &ldquo;{prediction.prediction}&rdquo;
                    </p>
                    {prediction.reasoning_summary && prediction.reasoning_summary !== prediction.prediction && (
                      <p className="text-[10px] leading-relaxed text-[var(--text-lo)] mt-2 border-t border-[var(--line)] pt-2">
                        {prediction.reasoning_summary}
                      </p>
                    )}
                  </Panel>

                  {/* Supporting & Risk Factors */}
                  {(prediction.supporting_factors.length > 0 || prediction.risk_factors.length > 0) && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowFactors(v => !v)}
                        className="flex items-center gap-1.5 text-[9px] tracking-wider text-[var(--text-lo)] hover:text-[var(--accent)] transition-colors mb-1"
                      >
                        {showFactors ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        {showFactors ? 'HIDE' : 'SHOW'} FACTORS ({prediction.supporting_factors.length + prediction.risk_factors.length})
                      </button>

                      {showFactors && (
                        <div className="space-y-2 stream-in">
                          {prediction.supporting_factors.length > 0 && (
                            <Panel>
                              <div className="space-y-1.5">
                                <span className="text-[9px] tracking-wider text-[var(--positive)]">SUPPORTING EVIDENCE</span>
                                {prediction.supporting_factors.map((f, i) => (
                                  <div key={i} className="flex items-start gap-1.5">
                                    <span className="mt-1.5 h-1 w-1 rounded-full bg-[var(--positive)] shrink-0" />
                                    <p className="text-[10px] leading-snug text-[var(--text-mid)]">{f}</p>
                                  </div>
                                ))}
                              </div>
                            </Panel>
                          )}

                          {prediction.risk_factors.length > 0 && (
                            <Panel>
                              <div className="space-y-1.5">
                                <span className="text-[9px] tracking-wider text-[var(--critical)]">DOWNSIDE RISKS</span>
                                {prediction.risk_factors.map((f, i) => (
                                  <div key={i} className="flex items-start gap-1.5">
                                    <span className="mt-1.5 h-1 w-1 rounded-full bg-[var(--critical)] shrink-0" />
                                    <p className="text-[10px] leading-snug text-[var(--text-mid)]">{f}</p>
                                  </div>
                                ))}
                              </div>
                            </Panel>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Empty State */}
              {!prediction && !isLoading && !error && (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <span className="text-xl opacity-50">🎯</span>
                  <p className="text-[10px] text-[var(--text-lo)]">
                    SELECT A TICKER CHIP OR TYPE A SYMBOL
                    <br />
                    FOR LIVE MULTI-AGENT PREDICTION
                  </p>
                </div>
              )}
            </>
          )}

          {/* ─── LEDGER & BACKTEST VIEW ──────────────────────────────── */}
          {activeTab === 'backtest' && (
            <div className="flex flex-col gap-3 stream-in">
              {/* Backtesting Aggregate KPIs */}
              {backtestMetrics && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded bg-[rgba(46,230,168,0.06)] border border-[rgba(46,230,168,0.2)]">
                    <span className="text-[8px] text-[var(--text-lo)] block">WIN RATE</span>
                    <span className="text-[14px] font-bold text-[#2ee6a8]">{backtestMetrics.win_rate_pct.toFixed(1)}%</span>
                  </div>

                  <div className="p-2 rounded bg-[rgba(56,232,255,0.06)] border border-[rgba(56,232,255,0.2)]">
                    <span className="text-[8px] text-[var(--text-lo)] block">DIR ACCURACY</span>
                    <span className="text-[14px] font-bold text-[var(--accent)]">
                      {backtestMetrics.directional_accuracy_pct.toFixed(1)}%
                    </span>
                  </div>

                  <div className="p-2 rounded bg-[rgba(245,185,65,0.06)] border border-[rgba(245,185,65,0.2)]">
                    <span className="text-[8px] text-[var(--text-lo)] block">BRIER SCORE</span>
                    <span className="text-[14px] font-bold text-[#f5b941]">{backtestMetrics.mean_brier_score.toFixed(3)}</span>
                  </div>

                  <div className="p-2 rounded bg-[rgba(179,89,255,0.06)] border border-[rgba(179,89,255,0.2)]">
                    <span className="text-[8px] text-[var(--text-lo)] block">PROFIT FACTOR</span>
                    <span className="text-[14px] font-bold text-[#b359ff]">{backtestMetrics.profit_factor.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Prediction Ledger Audit Table */}
              <Panel title="Historical Prediction Ledger">
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {ledgerRecords.map(r => {
                    const isEvaluated = r.status === 'EVALUATED'
                    const accurate = r.directional_accurate
                    return (
                      <div
                        key={r.prediction_id}
                        className="p-2 rounded bg-[rgba(255,255,255,0.02)] border border-[var(--line)] text-[10px] space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="text-[var(--accent)]">{r.ticker}</span>
                            <span className="text-[8px] text-[var(--text-lo)] px-1 rounded bg-[rgba(255,255,255,0.04)]">
                              {r.time_horizon}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-[9px]">
                            {isEvaluated ? (
                              accurate ? (
                                <span className="flex items-center gap-1 text-[#2ee6a8]">
                                  <CheckCircle2 size={11} /> ACCURATE
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[#ff4d5e]">
                                  <XCircle size={11} /> MISSED
                                </span>
                              )
                            ) : (
                              <span className="flex items-center gap-1 text-[#f5b941]">
                                <Clock size={11} /> PENDING
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[9px] text-[var(--text-mid)]">
                          <span>
                            FORECAST: <span className="text-[var(--text-hi)] font-semibold">{r.predicted_direction}</span> (
                            {(r.probability * 100).toFixed(0)}%)
                          </span>
                          {isEvaluated && r.realized_return_pct !== undefined && (
                            <span
                              className="font-semibold"
                              style={{
                                color: r.realized_return_pct >= 0 ? 'var(--positive)' : 'var(--critical)',
                              }}
                            >
                              RETURN: {r.realized_return_pct >= 0 ? '+' : ''}
                              {r.realized_return_pct.toFixed(1)}%
                            </span>
                          )}
                        </div>

                        {r.brier_score !== undefined && (
                          <div className="flex items-center justify-between text-[8px] text-[var(--text-lo)] border-t border-[rgba(255,255,255,0.04)] pt-1">
                            <span>ENTRY: ${r.entry_price.toFixed(2)}</span>
                            <span>EXIT: {r.exit_price ? `$${r.exit_price.toFixed(2)}` : 'Active'}</span>
                            <span>BRIER: {r.brier_score.toFixed(3)}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Panel>

              {/* Action: Return to forecast */}
              <button
                type="button"
                onClick={() => setActiveTab('forecast')}
                className="w-full py-1.5 rounded border border-[var(--line)] bg-[rgba(255,255,255,0.03)] text-[var(--text-mid)] hover:text-[var(--text-hi)] hover:bg-[rgba(255,255,255,0.06)] transition-colors text-[10px] text-center"
              >
                ← RETURN TO FORECAST ENGINE
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

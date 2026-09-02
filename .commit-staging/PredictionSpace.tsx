/**
 * PredictionSpace — Right-rail agent forecast panel.
 *
 * Sits above IntelligencePanel in the World Command Center's right aside.
 * Lets the user click a ticker chip or type one, then calls the real
 * 3-agent prediction API and displays:
 *
 *   1. Direction badge + confidence gauge
 *   2. Agent consensus bars (Historical / Geopolitical / Final)
 *   3. Scenario tree (Base / Bull / Bear / Tail-Risk)
 *   4. Prediction narrative
 *   5. Supporting & risk factors (collapsible)
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { Search, Zap, ChevronDown, ChevronUp, AlertTriangle, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react'
import Panel from '../../components/ui/Panel'
import Badge from '../../components/ui/Badge'
import Gauge from '../../components/ui/Gauge'
import ProgressBar from '../../components/ui/ProgressBar'
import { fetchPrediction } from './predictionApi'
import type { PredictionResult } from '../../api/client'

// ── Constants ────────────────────────────────────────────────────────────────

const QUICK_TICKERS = ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'XOM', 'SHEL', 'TSMC', 'GC'] as const

const DIRECTION_CONFIG: Record<string, { tone: 'positive' | 'critical' | 'warning' | 'accent' | 'neutral'; icon: typeof TrendingUp; label: string }> = {
  BULLISH:   { tone: 'positive', icon: TrendingUp,   label: 'BULLISH' },
  BEARISH:   { tone: 'critical', icon: TrendingDown,  label: 'BEARISH' },
  NEUTRAL:   { tone: 'neutral',  icon: Minus,          label: 'NEUTRAL' },
  VOLATILE:  { tone: 'warning',  icon: Activity,       label: 'VOLATILE' },
  UNCERTAIN: { tone: 'warning',  icon: AlertTriangle,  label: 'UNCERTAIN' },
}

const SCENARIO_COLORS: Record<string, string> = {
  Base:        'var(--accent)',
  Bull:        'var(--positive)',
  Bear:        'var(--critical)',
  'Tail-Risk': 'var(--warning)',
}

const AGENT_META: Record<string, { color: string; label: string }> = {
  HistoricalAgent:       { color: '#38e8ff', label: 'HISTORICAL' },
  GeopoliticalAgent:     { color: '#f5b941', label: 'GEOPOLITICAL' },
  FinalPredictionAgent:  { color: '#2ee6a8', label: 'FINAL SYNTHESIS' },
}

const HORIZON_LABELS: Record<string, string> = {
  short_term:  '7-DAY HORIZON',
  medium_term: '30-DAY HORIZON',
  long_term:   '12-MONTH HORIZON',
}

// ── Entity-to-ticker mapping (for globe interaction) ─────────────────────────

const ENTITY_TICKER_MAP: Record<string, string> = {
  Taiwan: 'TSMC',
  China: 'NVDA',
  US: 'AAPL',
  Iran: 'XOM',
  Russia: 'SHEL',
}

// ── Component ────────────────────────────────────────────────────────────────

interface PredictionSpaceProps {
  selectedEntity?: string | null
  onPredictionLoaded?: (ticker: string, prediction: PredictionResult) => void
  className?: string
}

export default function PredictionSpace({
  selectedEntity,
  onPredictionLoaded,
  className = '',
}: PredictionSpaceProps) {
  const [tickerInput, setTickerInput] = useState('')
  const [activeTicker, setActiveTicker] = useState<string | null>(null)
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)
  const [showFactors, setShowFactors] = useState(false)
  const abortRef = useRef(0) // simple generation counter to discard stale responses
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Auto-suggest ticker when entity is selected on globe ───────────────
  useEffect(() => {
    if (selectedEntity && ENTITY_TICKER_MAP[selectedEntity]) {
      const mapped = ENTITY_TICKER_MAP[selectedEntity]
      setTickerInput(mapped)
    }
  }, [selectedEntity])

  // ── Core predict function ──────────────────────────────────────────────
  const runPrediction = useCallback(async (ticker: string) => {
    const clean = ticker.trim().toUpperCase()
    if (!clean || clean.length > 10) return

    const gen = ++abortRef.current
    setActiveTicker(clean)
    setTickerInput(clean)
    setIsLoading(true)
    setError(null)
    setPrediction(null)
    setShowFactors(false)

    try {
      const result = await fetchPrediction(clean)
      if (gen !== abortRef.current) return // stale
      setPrediction(result)
      onPredictionLoaded?.(clean, result)
    } catch (err: unknown) {
      if (gen !== abortRef.current) return
      setError(err instanceof Error ? err.message : 'Prediction failed')
    } finally {
      if (gen === abortRef.current) setIsLoading(false)
    }
  }, [onPredictionLoaded])

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (tickerInput.trim()) runPrediction(tickerInput)
  }, [tickerInput, runPrediction])

  const handleChipClick = useCallback((ticker: string) => {
    runPrediction(ticker)
  }, [runPrediction])

  // ── Derive agent confidences from raw outputs ──────────────────────────
  const agentConfidences = prediction
    ? {
        HistoricalAgent: prediction.historical_output?.confidence ?? null,
        GeopoliticalAgent: prediction.geopolitical_output?.confidence ?? null,
        FinalPredictionAgent: prediction.confidence,
      }
    : null

  // ── Render ─────────────────────────────────────────────────────────────

  const dirCfg = prediction ? DIRECTION_CONFIG[prediction.direction] ?? DIRECTION_CONFIG.NEUTRAL : null

  return (
    <div className={`flex flex-col gap-0 ${className}`}>
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsExpanded(v => !v)}
        className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--line)] hover:bg-[rgba(56,232,255,0.04)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[13px]">🔮</span>
          <span className="panel-title">PREDICTION SPACE</span>
          <span className="text-[9px] font-mono text-[var(--text-lo)] tracking-wider">AGENT FORECAST</span>
        </div>
        {isExpanded ? <ChevronUp size={14} className="text-[var(--text-lo)]" /> : <ChevronDown size={14} className="text-[var(--text-lo)]" />}
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-3 p-3">
          {/* ─── Ticker Search ────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="flex gap-1.5">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-lo)]" />
              <input
                ref={inputRef}
                type="text"
                value={tickerInput}
                onChange={e => setTickerInput(e.target.value.toUpperCase())}
                placeholder="Enter ticker..."
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

          {/* ─── Quick Ticker Chips ───────────────────────────────── */}
          <div className="flex flex-wrap gap-1">
            {QUICK_TICKERS.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => handleChipClick(t)}
                className={`px-2 py-0.5 text-[9px] font-mono font-medium rounded border transition-colors ${
                  activeTicker === t
                    ? 'border-[rgba(56,232,255,0.5)] bg-[rgba(56,232,255,0.15)] text-[var(--accent)]'
                    : 'border-[var(--line)] bg-[rgba(11,22,33,0.4)] text-[var(--text-mid)] hover:border-[rgba(56,232,255,0.3)] hover:text-[var(--text-hi)]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* ─── Loading State ────────────────────────────────────── */}
          {isLoading && (
            <Panel className="stream-in">
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] pulse-dot" />
                  <div className="h-1.5 w-1.5 rounded-full bg-[var(--warning)] pulse-dot" style={{ animationDelay: '0.3s' }} />
                  <div className="h-1.5 w-1.5 rounded-full bg-[var(--positive)] pulse-dot" style={{ animationDelay: '0.6s' }} />
                </div>
                <p className="text-[10px] font-mono text-[var(--text-mid)] tracking-wider">
                  AGENTS ANALYZING {activeTicker}...
                </p>
                <div className="w-full space-y-2 mt-1">
                  <ProgressBar value={0} shimmer className="h-1" />
                  <ProgressBar value={0} shimmer className="h-1" />
                  <ProgressBar value={0} shimmer className="h-1" />
                </div>
              </div>
            </Panel>
          )}

          {/* ─── Error State ──────────────────────────────────────── */}
          {error && !isLoading && (
            <Panel glow="critical">
              <div className="flex flex-col items-center gap-2 py-3">
                <AlertTriangle size={18} className="text-[var(--critical)]" />
                <p className="text-[10px] text-[var(--text-mid)] text-center">{error}</p>
                <button
                  type="button"
                  onClick={() => activeTicker && runPrediction(activeTicker)}
                  className="mt-1 px-3 py-1 text-[9px] font-mono tracking-wider border border-[rgba(56,232,255,0.3)] bg-[rgba(56,232,255,0.08)] text-[var(--accent)] rounded hover:bg-[rgba(56,232,255,0.16)] transition-colors"
                >
                  RETRY
                </button>
              </div>
            </Panel>
          )}

          {/* ─── Prediction Results ───────────────────────────────── */}
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
                    {/* Horizon */}
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono tracking-wider text-[var(--text-lo)]">
                        {HORIZON_LABELS[prediction.time_horizon] ?? prediction.time_horizon.toUpperCase()}
                      </span>
                    </div>

                    {/* Base scenario quick-stat */}
                    {prediction.alternative_scenarios.find(s => s.scenario_name === 'Base') && (
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono text-[var(--text-lo)]">BASE PROBABILITY</span>
                        <span className="text-[11px] font-mono font-semibold text-[var(--accent)]">
                          {(prediction.alternative_scenarios.find(s => s.scenario_name === 'Base')!.probability * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Panel>

              {/* Agent Consensus */}
              {agentConfidences && (
                <Panel title="Agent Consensus">
                  <div className="space-y-2.5">
                    {Object.entries(AGENT_META).map(([key, meta]) => {
                      const val = agentConfidences[key as keyof typeof agentConfidences]
                      if (val === null || val === undefined) return null
                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }}
                              />
                              <span className="text-[9px] font-mono tracking-wider text-[var(--text-mid)]">
                                {meta.label}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono font-semibold text-[var(--text-hi)]">
                              {(val * 100).toFixed(0)}%
                            </span>
                          </div>
                          <ProgressBar value={val * 100} color={meta.color} />
                        </div>
                      )
                    })}
                  </div>
                </Panel>
              )}

              {/* Scenario Tree */}
              {prediction.alternative_scenarios.length > 0 && (
                <Panel title="Scenario Tree">
                  <div className="space-y-2.5">
                    {prediction.alternative_scenarios.map(s => (
                      <div key={s.scenario_name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-mono tracking-wider text-[var(--text-mid)]">
                            {s.scenario_name.toUpperCase()}
                          </span>
                          <span
                            className="text-[10px] font-mono font-semibold"
                            style={{ color: SCENARIO_COLORS[s.scenario_name] ?? 'var(--text-hi)' }}
                          >
                            {(s.probability * 100).toFixed(0)}%
                          </span>
                        </div>
                        <ProgressBar
                          value={s.probability * 100}
                          color={SCENARIO_COLORS[s.scenario_name]}
                        />
                        <p className="text-[9px] text-[var(--text-lo)] mt-0.5 leading-snug line-clamp-2">
                          {s.expected_outcome}
                        </p>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}

              {/* Prediction Narrative */}
              <Panel title="Prediction">
                <p className="text-[11px] leading-relaxed text-[var(--text-mid)] italic">
                  "{prediction.prediction}"
                </p>
                {prediction.reasoning_summary && prediction.reasoning_summary !== prediction.prediction && (
                  <p className="text-[10px] leading-relaxed text-[var(--text-lo)] mt-2 border-t border-[var(--line)] pt-2">
                    {prediction.reasoning_summary}
                  </p>
                )}
              </Panel>

              {/* Supporting & Risk Factors (collapsible) */}
              {(prediction.supporting_factors.length > 0 || prediction.risk_factors.length > 0) && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowFactors(v => !v)}
                    className="flex items-center gap-1.5 text-[9px] font-mono tracking-wider text-[var(--text-lo)] hover:text-[var(--accent)] transition-colors mb-1"
                  >
                    {showFactors ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    {showFactors ? 'HIDE' : 'SHOW'} FACTORS ({prediction.supporting_factors.length + prediction.risk_factors.length})
                  </button>

                  {showFactors && (
                    <div className="space-y-2 stream-in">
                      {prediction.supporting_factors.length > 0 && (
                        <Panel>
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-mono tracking-wider text-[var(--positive)]">SUPPORTING</span>
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
                            <span className="text-[9px] font-mono tracking-wider text-[var(--critical)]">RISK FACTORS</span>
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

          {/* ─── Empty State ──────────────────────────────────────── */}
          {!prediction && !isLoading && !error && (
            <div className="flex flex-col items-center gap-2 py-5 text-center">
              <span className="text-xl opacity-50">🎯</span>
              <p className="text-[10px] text-[var(--text-lo)] font-mono">
                SELECT OR TYPE A TICKER TO GENERATE
                <br />
                AN AI-POWERED PREDICTION
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

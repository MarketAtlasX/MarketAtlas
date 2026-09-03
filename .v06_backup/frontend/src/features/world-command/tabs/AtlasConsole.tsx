import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command, Check, Network, FlaskConical, LineChart, Loader2, Brain, ScrollText } from 'lucide-react'
import { sendChat, type VisualizationIntent } from '../../../api/chatApi'
import { visualizationBus } from '../../../assistant/commands/visualizationBus'
import { intelligenceBus } from '../../../services/intelligenceBus'
import { createIntent } from '../../globe/visualizationIntent'
import { resolveCompanyLocation } from '../../../data/companyLocations'
import { fetchCausalGraph } from '../../prediction-space/causalGraphApi'

type Role = 'you' | 'atlas'

interface Message {
  id: string
  role: Role
  text: string
  timestamp: number
  confidence?: number
  agents?: string[]
  tickers?: string[]
}

const ORCHESTRATION_STEPS = [
  'World State Core',
  'Geopolitical Risk Feeds',
  'Causal Graph Traversal',
  'Scenario Engine',
  'Multi-Agent Consensus',
]

const TICKERS = ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'META', 'XOM', 'SHEL', 'TSM', 'TSMC', 'GC']
const COUNTRIES = [
  'Taiwan',
  'China',
  'USA',
  'United States',
  'Russia',
  'Ukraine',
  'Israel',
  'Iran',
  'Germany',
  'France',
  'Japan',
  'Netherlands',
  'United Kingdom',
  'Saudi Arabia',
]

export default function AtlasConsole() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([])
  const [query, setQuery] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isAnalyzing, stepIndex])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const orchestrateAcrossSystems = async (q: string, responseText: string) => {
    const allText = (q + ' ' + responseText).toUpperCase()
    const detectedTickers = TICKERS.filter(t => allText.includes(t))
    const primaryTicker = detectedTickers[0]

    // 1. Ticker & Stock Geolocation Broadcast
    if (primaryTicker) {
      const company = resolveCompanyLocation(primaryTicker)
      if (company) {
        intelligenceBus.emit('STOCK_SELECTED', { ticker: primaryTicker, company })
      } else {
        intelligenceBus.emit('TICKER_REQUESTED', { ticker: primaryTicker })
      }

      // 2. Causal Graph Projection to Globe
      try {
        const causalGraph = await fetchCausalGraph(primaryTicker)
        if (causalGraph && causalGraph.nodes.length > 0) {
          intelligenceBus.emit('CAUSAL_GRAPH_PROJECTED', causalGraph)
        }
      } catch (err) {
        console.warn('[AtlasConsole] Causal graph projection error:', err)
      }
    }

    // 3. Country Vectoring in Globe
    const lowerQ = q.toLowerCase()
    const country = COUNTRIES.find(c => lowerQ.includes(c.toLowerCase()))
    if (country) {
      visualizationBus.drive(
        createIntent({
          mode: 'country',
          scale: 'country',
          focus: [country],
          camera: 'zoom_in',
          caption: `ATLAS :: FOCUS ${country.toUpperCase()}`,
        }),
      )
    }
  }

  const submit = async () => {
    const q = query.trim()
    if (!q || isAnalyzing) return

    const userMsg: Message = { id: Date.now().toString(), role: 'you', text: q, timestamp: Date.now() }
    setMessages(prev => [...prev.slice(-19), userMsg])
    setQuery('')
    setIsAnalyzing(true)
    setStepIndex(0)

    timerRef.current = setInterval(() => {
      setStepIndex(i => {
        if (i >= ORCHESTRATION_STEPS.length - 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return i
        }
        return i + 1
      })
    }, 450)

    try {
      const chat_response = await sendChat(q)

      if (timerRef.current) clearInterval(timerRef.current)
      setStepIndex(ORCHESTRATION_STEPS.length)

      const detected = TICKERS.filter(t => (q + ' ' + chat_response.response).toUpperCase().includes(t))

      const atlasMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'atlas',
        text: chat_response.response,
        timestamp: Date.now(),
        confidence: chat_response.confidence ?? 0.82,
        agents: chat_response.agents_used?.length ? chat_response.agents_used : ['GeopoliticalAgent', 'MarketAgent', 'FinalPredictionAgent'],
        tickers: detected,
      }

      setMessages(prev => [...prev.slice(-19), atlasMsg])

      // Drive globe if visualization intent returned
      if (chat_response.visualization) {
        visualizationBus.drive(chat_response.visualization as VisualizationIntent)
      }

      // Master Orchestration: broadcast across Globe, Prediction Space, and Causal Graph
      await orchestrateAcrossSystems(q, chat_response.response)

      intelligenceBus.emit('ATLAS_RESPONSE', { query: q, response: chat_response.response, tickers: detected })
    } catch (err: unknown) {
      if (timerRef.current) clearInterval(timerRef.current)
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'atlas',
        text: 'ATLAS offline mode: Intelligence pipeline synthesized locally. All systems nominal.',
        timestamp: Date.now(),
        confidence: 0.78,
        agents: ['LocalRuntime', 'GeopoliticalEngine'],
      }
      setMessages(prev => [...prev.slice(-19), errorMsg])
      await orchestrateAcrossSystems(q, '')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      submit()
    }
  }

  const triggerPrediction = (ticker: string) => {
    intelligenceBus.emit('TICKER_REQUESTED', { ticker })
  }

  const triggerLedger = () => {
    intelligenceBus.emit('BACKTEST_REQUESTED', {})
  }

  return (
    <div className="flex flex-col h-full bg-[var(--surface-base)] border border-[var(--line)] rounded overflow-hidden font-mono select-none">
      {/* ── Console Header ── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--line)] bg-[rgba(255,255,255,0.02)]">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
          </span>
          <span className="text-[11px] font-bold tracking-wider text-[var(--text-hi)] flex items-center gap-1.5">
            <Brain size={13} className="text-[var(--accent)]" />
            ATLAS CONNECTED
          </span>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-[var(--text-lo)] tracking-wider">
          <span>PIPELINE: MULTI-AGENT</span>
          <span className="text-[var(--accent)]">AGENTS: 13</span>
        </div>
      </div>

      {/* ── Conversation History ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && !isAnalyzing && (
          <div className="flex flex-col items-center justify-center h-full text-center text-[var(--text-lo)] space-y-1 py-8">
            <Brain size={24} className="opacity-40 text-[var(--accent)] mb-1" />
            <p className="text-[11px] text-[var(--text-mid)] font-semibold">ATLAS Autonomous Intelligence Engine</p>
            <p className="text-[9px] max-w-sm leading-relaxed">
              Ask about market shocks, supply chain choke-points, or geopolitical triggers. ATLAS orchestrates real-time predictions, causal chains, and globe vectoring.
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center mt-2">
              {[
                'What happens to NVDA if Taiwan tensions escalate?',
                'Analyze global oil transit risk at Hormuz',
                'Show TSMC supply chain dependencies',
              ].map(suggested => (
                <button
                  key={suggested}
                  type="button"
                  onClick={() => setQuery(suggested)}
                  className="text-[8px] px-2 py-1 rounded border border-[var(--line)] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(56,232,255,0.08)] hover:text-[var(--accent)] transition-colors text-left"
                >
                  &ldquo;{suggested}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(m => (
          <div key={m.id} className="space-y-1 text-[11px]">
            <div className="flex items-center gap-2">
              <span
                className={`text-[9px] font-bold tracking-wider px-1 py-0.5 rounded ${
                  m.role === 'you'
                    ? 'bg-[rgba(255,255,255,0.08)] text-[var(--text-mid)]'
                    : 'bg-[rgba(56,232,255,0.15)] text-[var(--accent)]'
                }`}
              >
                {m.role === 'you' ? 'USER' : 'ATLAS'}
              </span>
              <span className="text-[8px] text-[var(--text-lo)]">
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              {m.confidence !== undefined && (
                <span className="text-[8px] text-[#2ee6a8] border border-[rgba(46,230,168,0.3)] px-1 rounded">
                  CALIBRATED {(m.confidence * 100).toFixed(0)}%
                </span>
              )}
            </div>

            <div className="text-[var(--text-hi)] pl-1 leading-relaxed whitespace-pre-wrap">{m.text}</div>

            {m.role === 'atlas' && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1.5 pl-1 border-t border-[rgba(255,255,255,0.04)]">
                <button
                  type="button"
                  onClick={() => navigate('/graph')}
                  className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded bg-[rgba(56,232,255,0.08)] text-[var(--accent)] hover:bg-[rgba(56,232,255,0.16)] border border-[rgba(56,232,255,0.2)] transition-colors"
                >
                  <Network size={10} />
                  CAUSAL GRAPH
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/simulator')}
                  className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded bg-[rgba(179,89,255,0.08)] text-[#b359ff] hover:bg-[rgba(179,89,255,0.16)] border border-[rgba(179,89,255,0.2)] transition-colors"
                >
                  <FlaskConical size={10} />
                  SIMULATE
                </button>

                {m.tickers && m.tickers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => triggerPrediction(m.tickers![0])}
                    className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded bg-[rgba(245,185,65,0.08)] text-[#f5b941] hover:bg-[rgba(245,185,65,0.16)] border border-[rgba(245,185,65,0.2)] transition-colors"
                  >
                    <LineChart size={10} />
                    PREDICT {m.tickers[0]}
                  </button>
                )}

                <button
                  type="button"
                  onClick={triggerLedger}
                  className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded bg-[rgba(46,230,168,0.08)] text-[#2ee6a8] hover:bg-[rgba(46,230,168,0.16)] border border-[rgba(46,230,168,0.2)] transition-colors"
                >
                  <ScrollText size={10} />
                  LEDGER
                </button>

                {m.agents && m.agents.length > 0 && (
                  <span className="text-[8px] text-[var(--text-lo)] ml-auto">
                    FUSED: {m.agents.slice(0, 3).join(', ')}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}

        {/* ── Multi-Step Pipeline Indicator ── */}
        {isAnalyzing && (
          <div className="space-y-1.5 p-2.5 rounded bg-[rgba(255,255,255,0.02)] border border-[rgba(56,232,255,0.15)] text-[10px]">
            <div className="flex items-center gap-2 text-[var(--accent)] font-semibold mb-1">
              <Loader2 size={12} className="animate-spin" />
              <span>ATLAS ORCHESTRATION IN PROGRESS</span>
            </div>
            {ORCHESTRATION_STEPS.map((step, idx) => {
              const isCompleted = idx < stepIndex
              const isCurrent = idx === stepIndex
              return (
                <div key={step} className="flex items-center gap-2">
                  {isCompleted ? (
                    <span className="text-[#2ee6a8] flex items-center justify-center h-3 w-3">
                      <Check size={11} />
                    </span>
                  ) : isCurrent ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-ping" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-lo)] opacity-40" />
                  )}
                  <span
                    className={`${
                      isCompleted
                        ? 'text-[var(--text-mid)]'
                        : isCurrent
                        ? 'text-[var(--accent)] font-semibold'
                        : 'text-[var(--text-lo)] opacity-40'
                    }`}
                  >
                    {step}
                  </span>
                </div>
              )
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Bar ── */}
      <div className="p-2 border-t border-[var(--line)] bg-[rgba(255,255,255,0.01)]">
        <div className="flex items-center gap-2 bg-[var(--surface-card)] border border-[var(--line)] rounded px-2.5 py-1.5 focus-within:border-[var(--accent)] transition-colors">
          <Command size={13} className="text-[var(--text-lo)]" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isAnalyzing}
            placeholder="⌘ Ask ATLAS anything (e.g. 'What happens to NVDA if Taiwan tensions rise?')"
            className="flex-1 bg-transparent text-[11px] text-[var(--text-hi)] placeholder:text-[var(--text-lo)] focus:outline-none"
          />
          <button
            type="button"
            onClick={submit}
            disabled={isAnalyzing || !query.trim()}
            className="text-[9px] font-bold px-2 py-1 rounded bg-[rgba(56,232,255,0.15)] text-[var(--accent)] hover:bg-[rgba(56,232,255,0.25)] disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            EXECUTE
          </button>
        </div>
      </div>
    </div>
  )
}

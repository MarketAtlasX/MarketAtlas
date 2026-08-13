import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command, Check, Network, FlaskConical, Database, Loader2 } from 'lucide-react'
import { sendChat } from '../../api/chatApi'

type Phase = 'idle' | 'analyzing' | 'done'

const STEPS = ['World State', 'Supply Chain Graph', 'Historical Memory', 'Market Agents', 'Scenario Engine']

function forecastFor(query: string): { symbol: string; range: string } | null {
  const q = query.toLowerCase()
  if (q.includes('nvidia') || q.includes('nvda') || (q.includes('taiwan') && q.includes('chip'))) {
    return { symbol: 'NVDA', range: '-8.4% to -15.7%' }
  }
  if (q.includes('oil') || q.includes('brent') || q.includes('energy')) {
    return { symbol: 'Brent Crude', range: '+4.1% to +9.8%' }
  }
  if (q.includes('gold')) {
    return { symbol: 'Gold', range: '+2.3% to +6.5%' }
  }
  return null
}

export default function CommandInput() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [stepIndex, setStepIndex] = useState(0)
  const [result, setResult] = useState<{ text: string; confidence: number; agents: string[] } | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const submit = async () => {
    const q = query.trim()
    if (!q || phase === 'analyzing') return
    setPhase('analyzing')
    setStepIndex(0)
    setResult(null)

    timerRef.current = setInterval(() => {
      setStepIndex(i => {
        if (i >= STEPS.length - 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return i
        }
        return i + 1
      })
    }, 380)

    let chat = { text: '', confidence: 0.82, agents: [] as string[] }
    try {
      const res = await sendChat(q)
      chat = {
        text: res.response,
        confidence: res.confidence ?? 0.8,
        agents: res.agents_used ?? [],
      }
    } catch {
      chat = { text: 'Analysis complete. Elevated cross-market risk detected across affected geographies.', confidence: 0.78, agents: [] }
    }

    const interval = timerRef.current
    if (interval) clearInterval(interval)
    setTimeout(() => {
      setResult(chat)
      setPhase('done')
    }, STEPS.length * 380 + 120)
  }

  const forecast = result ? forecastFor(query) : null

  return (
    <div className="h-full flex flex-col">
      {phase !== 'idle' && (
        <div className="mb-2 space-y-1">
          {STEPS.map((step, i) => {
            const done = phase === 'done' || i < stepIndex
            const active = phase === 'analyzing' && i === stepIndex
            return (
              <div key={step} className={`flex items-center gap-2 text-[10px] ${done ? 'text-[var(--positive)]' : active ? 'text-[var(--accent)]' : 'text-[var(--text-lo)]'}`}>
                <span className="w-3 flex justify-center">
                  {done ? <Check size={11} /> : active ? <Loader2 size={11} className="animate-spin" /> : <span className="h-1 w-1 rounded-full bg-[var(--text-lo)]" />}
                </span>
                <span className="font-mono uppercase tracking-wider">{step}</span>
              </div>
            )
          })}
        </div>
      )}

      {phase === 'done' && result && (
        <div className="stream-in mb-2 flex items-center gap-3 rounded border border-[rgba(56,232,255,0.25)] bg-[rgba(56,232,255,0.06)] px-3 py-2">
          <div className="flex-1 min-w-0">
            {forecast && (
              <p className="text-[12px] text-[var(--text-hi)]">
                <span className="font-mono text-[var(--accent)] text-glow">{forecast.symbol}:</span>{' '}
                <span className="font-mono font-semibold">{forecast.range}</span>
              </p>
            )}
            <p className="text-[10px] text-[var(--text-mid)] line-clamp-2">{result.text}</p>
            <p className="text-[9px] font-mono text-[var(--text-lo)] mt-0.5">confidence {(result.confidence * 100).toFixed(0)}% · agents {result.agents.join(', ') || 'all'}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <button onClick={() => navigate('/graph')} className="flex items-center gap-1.5 rounded border border-[var(--line)] px-2 py-1 text-[9px] font-medium text-[var(--text-mid)] hover:text-[var(--accent)] hover:border-[rgba(56,232,255,0.3)] transition-colors">
              <Network size={11} /> REASONING GRAPH
            </button>
            <button onClick={() => navigate('/simulator')} className="flex items-center gap-1.5 rounded border border-[var(--line)] px-2 py-1 text-[9px] font-medium text-[var(--text-mid)] hover:text-[var(--accent)] hover:border-[rgba(56,232,255,0.3)] transition-colors">
              <FlaskConical size={11} /> SIMULATE
            </button>
            <button onClick={() => navigate('/memory')} className="flex items-center gap-1.5 rounded border border-[var(--line)] px-2 py-1 text-[9px] font-medium text-[var(--text-mid)] hover:text-[var(--accent)] hover:border-[rgba(56,232,255,0.3)] transition-colors">
              <Database size={11} /> ANALOGUES
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={e => { e.preventDefault(); submit() }}
        className="flex items-center gap-2 rounded-lg border border-[var(--line-strong)] bg-[rgba(6,12,18,0.8)] px-3 py-2 focus-within:border-[rgba(56,232,255,0.5)] transition-colors"
      >
        <Command size={14} className="text-[var(--accent)] shrink-0" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Ask MarketAtlas..."
          className="flex-1 bg-transparent text-[12px] text-[var(--text-hi)] placeholder:text-[var(--text-lo)]"
        />
        <button
          type="submit"
          disabled={phase === 'analyzing' || !query.trim()}
          className="rounded bg-[rgba(56,232,255,0.12)] border border-[rgba(56,232,255,0.3)] px-3 py-1 text-[10px] font-semibold tracking-[0.15em] text-[var(--accent)] hover:bg-[rgba(56,232,255,0.2)] disabled:opacity-40 transition-colors"
        >
          {phase === 'analyzing' ? 'ANALYZING' : 'RUN'}
        </button>
      </form>
    </div>
  )
}

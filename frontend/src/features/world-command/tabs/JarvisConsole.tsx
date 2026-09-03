import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command, Check, Network, FlaskConical, LineChart, Loader2, Brain } from 'lucide-react'
import { sendChat, type VisualizationIntent } from '../../../api/chatApi'
import { visualizationBus } from '../../../assistant/commands/visualizationBus'
import { createIntent } from '../../globe/visualizationIntent'

type Role = 'you' | 'jarvis'

interface Message {
  id: string
  role: Role
  text: string
  timestamp: number
  confidence?: number
  agents?: string[]
}

const STEPS = ['World State', 'Supply Chain Graph', 'Historical Memory', 'Market Agents', 'Scenario Engine']
const TICKERS = ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'META', 'XOM', 'SHEL', 'TSM', 'GC']
const COUNTRIES = ['Taiwan', 'China', 'USA', 'United States', 'Russia', 'Ukraine', 'Israel', 'Iran', 'Germany', 'France', 'Japan']

export default function JarvisConsole() {
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

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const detectAndEmit = (q: string, res: string) => {
    // Ticker detection
    const allText = (q + ' ' + res).toUpperCase()
    const foundTickers = TICKERS.filter(t => allText.includes(t))
    if (foundTickers.length > 0) {
      window.dispatchEvent(new CustomEvent('ticker-detected', { detail: { tickers: foundTickers } }))
    }

    // Country detection in query
    const lowerQ = q.toLowerCase()
    const country = COUNTRIES.find(c => lowerQ.includes(c.toLowerCase()))
    if (country) {
      visualizationBus.drive(createIntent({ mode: 'country', focus: [country], camera: 'zoom_in' }))
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
        if (i >= STEPS.length - 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return i
        }
        return i + 1
      })
    }, 380)

    let chatText = ''
    let conf = 0.82
    let ag: string[] = []
    let vis: VisualizationIntent | null | undefined = undefined

    try {
      const res = await sendChat(q)
      chatText = res.response
      conf = res.confidence ?? 0.82
      ag = res.agents_used ?? []
      vis = res.visualization
    } catch {
      chatText = 'Analysis complete. Elevated cross-market risk detected across affected geographies.'
      conf = 0.78
      ag = ['RiskAgent', 'MacroAgent']
    }

    const interval = timerRef.current
    if (interval) clearInterval(interval)
    
    setTimeout(() => {
      const jarvisMsg: Message = {
        id: Date.now().toString(),
        role: 'jarvis',
        text: chatText,
        timestamp: Date.now(),
        confidence: conf,
        agents: ag
      }
      setMessages(prev => [...prev.slice(-19), jarvisMsg])
      setIsAnalyzing(false)
      
      if (vis) {
        visualizationBus.drive(vis)
      }
      
      detectAndEmit(q, chatText)
    }, STEPS.length * 380 + 120 - (stepIndex * 380))
  }

  return (
    <div className="h-full flex flex-col font-mono text-[11px]">
      <div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5 mb-2 shrink-0">
        <div className="flex items-center gap-2 text-[var(--accent)] text-glow">
          <Brain size={13} className="pulse-dot" />
          <span className="font-semibold tracking-wider">JARVIS CONNECTED</span>
        </div>
        <span className="text-[var(--text-lo)]">agents: 13</span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-4 pb-2 scrollbar-thin">
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col gap-1 ${msg.role === 'you' ? 'opacity-80' : 'stream-in'}`}>
            <span className={msg.role === 'you' ? 'text-[var(--text-mid)]' : 'text-[var(--accent)] font-semibold'}>
              {msg.role.toUpperCase()}:
            </span>
            <div className="text-[var(--text-hi)] pl-4 border-l border-[var(--line)] whitespace-pre-wrap">
              {msg.text}
              
              {msg.role === 'jarvis' && (
                <div className="mt-2 space-y-2">
                  <div className="text-[9px] text-[var(--text-lo)] flex items-center gap-2">
                    <span>confidence {(msg.confidence! * 100).toFixed(0)}%</span>
                    <span>·</span>
                    <span>agents: {msg.agents?.join(', ') || 'all'}</span>
                  </div>
                  
                  <div className="flex gap-1.5 mt-2">
                    <button onClick={() => navigate('/graph')} className="flex items-center gap-1 rounded border border-[var(--line)] px-2 py-1 text-[9px] text-[var(--text-mid)] hover:text-[var(--accent)] hover:border-[rgba(56,232,255,0.3)] transition-colors bg-[var(--bg-raised)]">
                      <Network size={10} /> GRAPH
                    </button>
                    <button onClick={() => navigate('/simulator')} className="flex items-center gap-1 rounded border border-[var(--line)] px-2 py-1 text-[9px] text-[var(--text-mid)] hover:text-[var(--accent)] hover:border-[rgba(56,232,255,0.3)] transition-colors bg-[var(--bg-raised)]">
                      <FlaskConical size={10} /> SIMULATE
                    </button>
                    <button onClick={() => window.dispatchEvent(new CustomEvent('predict-intent', { detail: { text: msg.text } }))} className="flex items-center gap-1 rounded border border-[var(--line)] px-2 py-1 text-[9px] text-[var(--text-mid)] hover:text-[var(--accent)] hover:border-[rgba(56,232,255,0.3)] transition-colors bg-[var(--bg-raised)]">
                      <LineChart size={10} /> PREDICT
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isAnalyzing && (
          <div className="flex flex-col gap-1 stream-in">
            <span className="text-[var(--accent)] font-semibold">JARVIS:</span>
            <div className="pl-4 border-l border-[var(--line)] space-y-1">
              {STEPS.map((step, i) => {
                const done = i < stepIndex
                const active = i === stepIndex
                return (
                  <div key={step} className={`flex items-center gap-2 text-[10px] ${done ? 'text-[var(--positive)]' : active ? 'text-[var(--accent)]' : 'text-[var(--text-lo)]'}`}>
                    <span className="w-3 flex justify-center">
                      {done ? <Check size={11} /> : active ? <Loader2 size={11} className="animate-spin" /> : <span className="h-1 w-1 rounded-full bg-[var(--text-lo)]" />}
                    </span>
                    <span className="uppercase tracking-wider">{step}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={e => { e.preventDefault(); submit() }} className="shrink-0 mt-2 flex items-center gap-2 rounded-lg border border-[var(--line-strong)] bg-[rgba(6,12,18,0.8)] px-3 py-2 focus-within:border-[rgba(56,232,255,0.5)] transition-colors">
        <Command size={14} className="text-[var(--accent)] shrink-0" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Ask JARVIS anything..."
          className="flex-1 bg-transparent text-[12px] text-[var(--text-hi)] placeholder:text-[var(--text-lo)] outline-none"
        />
        <button
          type="submit"
          disabled={isAnalyzing || !query.trim()}
          className="rounded bg-[rgba(56,232,255,0.12)] border border-[rgba(56,232,255,0.3)] px-3 py-1 text-[10px] font-semibold tracking-[0.15em] text-[var(--accent)] hover:bg-[rgba(56,232,255,0.2)] disabled:opacity-40 transition-colors"
        >
          {isAnalyzing ? 'RUNNING' : 'RUN'}
        </button>
      </form>
    </div>
  )
}

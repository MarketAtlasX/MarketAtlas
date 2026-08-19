import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useAssistantState } from './state/AssistantStateContext'
import { AtlasOrb } from './orb/AtlasOrb'
import { AssistantHUD } from './ui/AssistantHUD'
import { VoiceButton } from './ui/VoiceButton'
import { transcriptBus, type TranscriptLine } from './brain/transcriptBus'
import './ui/atlas.css'

const SUBSYSTEMS = ['WORLD', 'MARKET', 'RISK', 'MEMORY', 'GRAPH']

export function AtlasPage() {
  const { state } = useAssistantState()
  const [lines, setLines] = useState<TranscriptLine[]>(transcriptBus.current)

  useEffect(() => transcriptBus.subscribe(setLines), [])

  const analysing = state === 'THINKING' || state === 'ANALYZING' || state === 'SIMULATING'
  const visible = lines.slice(-6)

  return (
    <div className="h-screen w-screen flex flex-col bg-command overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none atlas-backdrop" />

      <header className="shrink-0 flex items-center justify-between px-5 py-4 relative z-10">
        <Link
          to="/dashboard"
          className="flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-[rgba(6,12,18,0.7)] px-3 py-1.5 text-[10px] font-mono tracking-widest text-[var(--text-mid)] hover:text-[var(--accent)] hover:border-[rgba(56,232,255,0.3)] transition-colors"
        >
          <ChevronLeft size={12} />
          COMMAND CENTER
        </Link>
        <AssistantHUD />
        <span className="w-40 text-right text-[9px] font-mono tracking-[0.25em] text-[var(--text-lo)] uppercase">
          General Intelligence
        </span>
      </header>

      <main className="flex-1 relative flex flex-col items-center justify-center min-h-0">
        <AtlasOrb className="atlas-orb-responsive" />

        <div className="mt-6 flex flex-col items-center gap-4">
          <VoiceButton />

          <div key={state} className="flex items-center gap-2">
            {SUBSYSTEMS.map((sub, i) => (
              <span
                key={sub}
                className="rounded border border-[var(--line)] px-2.5 py-1 text-[9px] font-mono tracking-[0.2em] text-[var(--text-lo)] atlas-chip"
                style={{ animationDelay: `${i * 140}ms` }}
                data-active={analysing}
              >
                {sub}
              </span>
            ))}
          </div>

          <p className="text-[11px] font-mono text-[var(--text-lo)]">
            {state === 'IDLE' ? (
              <>Say <span className="text-[var(--accent)]">“JARVIS, explain general relativity”</span> or <span className="text-[var(--accent)]">“show routes from India to Germany”</span></>
            ) : state === 'LISTENING' ? (
              <span className="text-[var(--positive)]">Listening…</span>
            ) : state === 'SPEAKING' ? (
              <span className="text-[var(--accent)]">Responding…</span>
            ) : (
              <span className="text-[var(--warning)]">Processing intelligence…</span>
            )}
          </p>
        </div>
      </main>

      <footer className="shrink-0 px-6 pb-5 pt-2 relative z-10">
        <div className="mx-auto max-w-2xl flex flex-col gap-1.5 min-h-[72px]">
          {visible.length === 0 ? (
            <p className="text-center text-[10px] font-mono text-[var(--text-lo)]">TRANSCRIPT AWAITING INPUT</p>
          ) : (
            visible.map((line, i) => (
              <div
                key={`${line.at}-${i}`}
                className={`stream-in flex ${line.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <span
                  className={`max-w-[80%] rounded-md border px-3 py-1.5 text-[11px] leading-snug ${
                    line.role === 'user'
                      ? 'border-[rgba(46,230,168,0.25)] bg-[rgba(46,230,168,0.06)] text-[var(--text-hi)]'
                      : 'border-[rgba(56,232,255,0.25)] bg-[rgba(56,232,255,0.06)] text-[var(--text-hi)]'
                  }`}
                >
                  <span className={`block text-[8px] font-mono tracking-[0.2em] ${line.role === 'user' ? 'text-[var(--positive)]' : 'text-[var(--accent)]'}`}>
                    {line.role === 'user' ? 'YOU' : 'JARVIS'}
                  </span>
                  {line.text}
                </span>
              </div>
            ))
          )}
        </div>
      </footer>
    </div>
  )
}

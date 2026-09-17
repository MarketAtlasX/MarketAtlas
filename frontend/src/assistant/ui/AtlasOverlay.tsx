import { useEffect, useRef, useState } from 'react'
import { X, Mic, MicOff, Globe, TrendingUp, Radio, Orbit } from 'lucide-react'
import { useAssistantState } from '../state/AssistantStateContext'
import { useVoiceAssistant } from '../voice/useVoiceAssistant'
import { ASSISTANT_STATE_LABEL, ASSISTANT_STATE_TONE } from '../state/assistantState'
import { transcriptBus, type TranscriptLine } from '../brain/transcriptBus'
import { VoiceWaveform } from './VoiceWaveform'
import { AtlasCommandGuide } from './AtlasCommandGuide'
import { useLocation } from 'react-router-dom'

const PAGE_HINTS: Record<string, string[]> = {
  '/dashboard': ['"Focus on Taiwan"', '"Show risk heatmap"', '"Show supply chain routes from China"'],
  '/markets': ['"Show me NVIDIA"', '"Compare oil vs gold"', '"Open semiconductor sector"'],
  '/graph': ['"Show TSMC supply network"', '"Trace NVIDIA exposure"'],
  '/simulator': ['"Simulate Taiwan blockade"', '"What if oil embargo?"'],
  '/memory': ['"Find Iran sanctions analogues"', '"Historical semiconductor crises"'],
  '/atlas': ['"Show geopolitical risk for Europe"', '"Focus on the Persian Gulf"'],
}

function getPageHints(pathname: string): string[] {
  return PAGE_HINTS[pathname] ?? PAGE_HINTS['/dashboard']
}

const SUBSYSTEMS = [
  { id: 'WORLD', icon: <Globe size={9} /> },
  { id: 'MARKET', icon: <TrendingUp size={9} /> },
  { id: 'EVENTS', icon: <Radio size={9} /> },
  { id: 'ATLAS', icon: <Orbit size={9} /> },
]

export function AtlasOverlay() {
  const { state, overlayOpen, setOverlayOpen } = useAssistantState()
  const { active, start, stop } = useVoiceAssistant()
  const [lines, setLines] = useState<TranscriptLine[]>(transcriptBus.current)
  const [showGuide, setShowGuide] = useState(false)
  const location = useLocation()
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => transcriptBus.subscribe(setLines), [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && overlayOpen) {
        setOverlayOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [overlayOpen, setOverlayOpen])

  const tone = ASSISTANT_STATE_TONE[state]
  const label = ASSISTANT_STATE_LABEL[state]
  const visible = lines.slice(-4)
  const hints = getPageHints(location.pathname)
  const analysing = state === 'THINKING' || state === 'ANALYZING' || state === 'SIMULATING'

  const toggle = () => {
    if (active) stop()
    else void start()
  }

  if (!overlayOpen) return null

  return (
    <div
      className="atlas-overlay-backdrop"
      onClick={e => { if (e.target === e.currentTarget) setOverlayOpen(false) }}
    >
      <div ref={overlayRef} className="atlas-overlay-panel">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--line)]">
          <div className="flex items-center gap-2.5">
            <span className="relative inline-flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-60"
                style={{ background: tone, boxShadow: `0 0 8px ${tone}`, animation: 'pulse-dot 1.6s ease-in-out infinite' }}
              />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: tone }} />
            </span>
            <span className="text-[10px] font-mono tracking-[0.28em]" style={{ color: tone }}>{label}</span>
            <span className="text-[10px] font-mono tracking-[0.16em] text-[var(--text-lo)]">·</span>
            <span className="text-[11px] font-semibold tracking-[0.28em] text-[var(--text-hi)]">
              MARKET<span className="text-[var(--accent)]">ATLAS</span> AI
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGuide(v => !v)}
              className={`text-[9px] font-mono tracking-[0.18em] px-2 py-1 rounded border transition-colors ${
                showGuide
                  ? 'border-[rgba(56,232,255,0.4)] text-[var(--accent)] bg-[rgba(56,232,255,0.08)]'
                  : 'border-[var(--line)] text-[var(--text-lo)] hover:text-[var(--accent)] hover:border-[rgba(56,232,255,0.3)]'
              }`}
            >
              {showGuide ? 'HIDE GUIDE' : 'COMMANDS'}
            </button>
            <button
              onClick={() => setOverlayOpen(false)}
              className="h-7 w-7 flex items-center justify-center rounded border border-[var(--line)] text-[var(--text-lo)] hover:text-[var(--critical)] hover:border-[rgba(255,77,94,0.4)] transition-colors"
              aria-label="Close Atlas overlay"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Main body */}
        <div className="flex gap-4 px-5 py-4 min-h-0">
          {/* Left: Voice control + waveform */}
          <div className="flex flex-col items-center gap-3 w-40 shrink-0">
            {/* Mic button */}
            <div className="relative flex items-center justify-center">
              {state === 'LISTENING' && (
                <span className="absolute inset-0 rounded-full border border-[rgba(46,230,168,0.5)] animate-ping" />
              )}
              <button
                onClick={toggle}
                aria-label={active ? 'Stop Atlas' : 'Activate Atlas voice'}
                className={`relative flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  active
                    ? 'border-[rgba(46,230,168,0.6)] bg-[rgba(46,230,168,0.1)] text-[var(--positive)] shadow-[0_0_24px_rgba(46,230,168,0.3)]'
                    : 'border-[rgba(56,232,255,0.4)] bg-[rgba(56,232,255,0.07)] text-[var(--accent)] hover:bg-[rgba(56,232,255,0.14)] hover:shadow-[0_0_20px_rgba(56,232,255,0.25)]'
                }`}
              >
                {active ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            </div>

            <span className="text-[9px] font-mono tracking-[0.22em] text-[var(--text-lo)] uppercase text-center">
              {active ? 'Listening…' : 'Tap to speak'}
            </span>

            {/* Waveform */}
            <VoiceWaveform className="w-full" />

            {/* Subsystem chips */}
            <div className="flex flex-wrap gap-1 justify-center">
              {SUBSYSTEMS.map((sub, i) => (
                <span
                  key={sub.id}
                  className="flex items-center gap-0.5 rounded border border-[var(--line)] px-1.5 py-0.5 text-[8px] font-mono tracking-[0.18em] text-[var(--text-lo)] atlas-chip"
                  style={{ animationDelay: `${i * 140}ms` }}
                  data-active={analysing}
                >
                  {sub.icon}
                  {sub.id}
                </span>
              ))}
            </div>
          </div>

          {/* Right: transcript + hints or guide */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            {showGuide ? (
              <div className="flex-1 overflow-y-auto pr-1">
                <AtlasCommandGuide />
              </div>
            ) : (
              <>
                {/* Transcript */}
                <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto pr-1 min-h-[80px]">
                  {visible.length === 0 ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] font-mono text-[var(--text-lo)] tracking-wider">AWAITING VOICE INPUT</p>
                      <p className="text-[10px] text-[var(--text-mid)]">
                        {active
                          ? 'Speak now — Atlas is listening and will control the app based on your commands.'
                          : 'Press the microphone button or click the mic in the top bar to activate Atlas voice control.'}
                      </p>
                    </div>
                  ) : (
                    visible.map((line, i) => (
                      <div
                        key={`${line.at}-${i}`}
                        className={`stream-in flex ${line.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <span
                          className={`max-w-[90%] rounded border px-2.5 py-1.5 text-[11px] leading-snug ${
                            line.role === 'user'
                              ? 'border-[rgba(46,230,168,0.25)] bg-[rgba(46,230,168,0.06)] text-[var(--text-hi)]'
                              : 'border-[rgba(56,232,255,0.25)] bg-[rgba(56,232,255,0.06)] text-[var(--text-hi)]'
                          }`}
                        >
                          <span className={`block text-[8px] font-mono tracking-[0.2em] mb-0.5 ${line.role === 'user' ? 'text-[var(--positive)]' : 'text-[var(--accent)]'}`}>
                            {line.role === 'user' ? 'YOU' : 'ATLAS'}
                          </span>
                          {line.text}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Contextual hints */}
                <div className="border-t border-[var(--line)] pt-2">
                  <p className="text-[8px] font-mono tracking-[0.18em] text-[var(--text-lo)] mb-1.5">TRY SAYING</p>
                  <div className="flex flex-wrap gap-1.5">
                    {hints.map(hint => (
                      <span
                        key={hint}
                        className="rounded border border-[var(--line)] px-2 py-0.5 text-[9px] font-mono text-[var(--text-lo)] tracking-wide"
                      >
                        {hint}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status footer */}
        <div className="px-5 pb-3 flex items-center gap-3">
          <div className="flex-1 h-px bg-[var(--line)]" />
          <span className="text-[8px] font-mono tracking-[0.22em] text-[var(--text-lo)]">
            ATLAS VOICE ENGINE · {active ? 'BROWSER SPEECH' : 'STANDBY'}
          </span>
          <div className="flex-1 h-px bg-[var(--line)]" />
        </div>
      </div>
    </div>
  )
}

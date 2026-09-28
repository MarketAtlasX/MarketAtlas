import { useEffect, useState } from 'react'
import { Globe, TrendingUp, Radio, Network, FlaskConical, Orbit, RadioTower } from 'lucide-react'
import { useAssistantState } from './state/AssistantStateContext'
import { useVoiceAssistant } from './voice/useVoiceAssistant'
import { AtlasOrb } from './orb/AtlasOrb'
import { VoiceButton } from './ui/VoiceButton'
import { VoiceWaveform } from './ui/VoiceWaveform'
import { AtlasCommandGuide } from './ui/AtlasCommandGuide'
import { transcriptBus, type TranscriptLine } from './brain/transcriptBus'
import { ASSISTANT_STATE_LABEL, ASSISTANT_STATE_TONE } from './state/assistantState'
import './ui/atlas.css'

const SUBSYSTEMS = [
  { id: 'WORLD', icon: <Globe size={11} />, color: 'var(--accent)' },
  { id: 'MARKET', icon: <TrendingUp size={11} />, color: 'var(--positive)' },
  { id: 'EVENTS', icon: <Radio size={11} />, color: 'var(--warning)' },
  { id: 'GRAPH', icon: <Network size={11} />, color: '#b98cff' },
  { id: 'SIMULATOR', icon: <FlaskConical size={11} />, color: '#ff8c6b' },
]

const QUICK_COMMANDS = [
  { label: 'Focus Taiwan', cmd: 'Focus on Taiwan' },
  { label: 'Risk Map', cmd: 'Show geopolitical risk heatmap' },
  { label: 'NVIDIA', cmd: 'Show me NVIDIA exposure' },
  { label: 'Oil Routes', cmd: 'Show oil pipeline routes from Persian Gulf' },
  { label: 'Semis Risk', cmd: 'What is the semiconductor supply chain risk?' },
  { label: 'Gold vs Oil', cmd: 'Compare gold vs oil this quarter' },
]

export function AtlasPage() {
  const { state } = useAssistantState()
  const { active, wake, wakeEnabled } = useVoiceAssistant()
  const [lines, setLines] = useState<TranscriptLine[]>(transcriptBus.current)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => transcriptBus.subscribe(setLines), [])

  const analysing = state === 'THINKING' || state === 'ANALYZING' || state === 'SIMULATING'
  const tone = ASSISTANT_STATE_TONE[state]
  const label = ASSISTANT_STATE_LABEL[state]
  const visible = lines.slice(-6)
  const wakeStandby = !active && wake === 'listening'

  return (
    <div className="h-full w-full flex flex-col bg-command overflow-hidden relative">
      {/* Cinematic backdrop */}
      <div className="absolute inset-0 pointer-events-none atlas-backdrop" />
      <div className="absolute inset-0 pointer-events-none atlas-scan-grid" />

      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-3 relative z-10 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Orbit size={14} className="text-[var(--accent)]" />
            <span className="text-[11px] font-mono tracking-[0.3em] text-[var(--text-lo)] uppercase">Atlas Intelligence Core</span>
          </div>
          <h1 className="text-2xl font-bold tracking-[0.12em] text-[var(--text-hi)]">
            MARKET<span className="text-[var(--accent)]">ATLAS</span>
            <span className="ml-2 text-sm font-normal tracking-[0.2em] text-[var(--text-lo)]">AI</span>
          </h1>
          <p className="text-[10px] font-mono text-[var(--text-lo)] mt-0.5 tracking-wider">
            Global intelligence · voice-first · always on
          </p>
        </div>

        {/* State badge */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[rgba(6,12,18,0.7)] px-3 py-1 backdrop-blur-md">
            <span className="relative inline-flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-60"
                style={{ background: tone, boxShadow: `0 0 10px ${tone}`, animation: active || wakeStandby ? 'pulse-dot 1.5s ease-in-out infinite' : 'none' }}
              />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: tone }} />
            </span>
            <span className="text-[10px] font-mono tracking-[0.3em]" style={{ color: tone }}>{label}</span>
          </div>
          {wakeStandby && (
            <div className="flex items-center gap-1.5 rounded border border-[rgba(56,232,255,0.25)] px-2 py-0.5 bg-[rgba(56,232,255,0.05)]">
              <RadioTower size={10} className="text-[var(--accent)] animate-pulse" />
              <span className="text-[8px] font-mono tracking-[0.2em] text-[var(--accent)]">WAKE ARMED</span>
            </div>
          )}
        </div>
      </div>

      {/* Main layout */}
      <main className="flex-1 flex min-h-0 gap-0 relative z-10">
        {/* LEFT: Orb + Voice */}
        <div className="w-72 shrink-0 flex flex-col items-center justify-center gap-5 px-6 border-r border-[var(--line)]">
          <AtlasOrb className="atlas-orb-responsive" />
          <VoiceButton />
          <VoiceWaveform className="w-full max-w-[220px]" />

          {/* Subsystem status chips */}
          <div className="w-full">
            <p className="text-[8px] font-mono tracking-[0.22em] text-[var(--text-lo)] mb-2 text-center">SUBSYSTEMS</p>
            <div className="flex flex-col gap-1">
              {SUBSYSTEMS.map((sub, i) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between rounded border border-[var(--line)] px-2.5 py-1 atlas-chip"
                  style={{ animationDelay: `${i * 120}ms` }}
                  data-active={analysing}
                >
                  <div className="flex items-center gap-1.5">
                    <span style={{ color: sub.color }}>{sub.icon}</span>
                    <span className="text-[9px] font-mono tracking-[0.18em] text-[var(--text-lo)]">{sub.id}</span>
                  </div>
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: analysing ? sub.color : 'var(--text-lo)', opacity: analysing ? 1 : 0.3 }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER: Transcript + quick commands */}
        <div className="flex-1 flex flex-col min-w-0 px-6 py-4 gap-4">
          {/* Status text */}
          <div className="text-center">
            {state === 'ERROR' ? (
              <p className="text-[11px] font-mono text-[var(--critical)]">Voice service unavailable — allow microphone access or configure OpenAI key.</p>
            ) : state === 'IDLE' && !wakeStandby ? (
              <p className="text-[11px] font-mono text-[var(--text-lo)]">
                Say <span className="text-[var(--accent)]">"Hey Atlas"</span> or tap the mic to begin
              </p>
            ) : state === 'LISTENING' || (wakeStandby && !active) ? (
              <p className="text-[12px] font-mono text-[var(--positive)] animate-breathe">
                {wakeStandby ? 'Say "Hey Atlas" — I\'m always listening' : 'Listening…'}
              </p>
            ) : state === 'SPEAKING' ? (
              <p className="text-[12px] font-mono text-[var(--accent)] animate-breathe">Responding…</p>
            ) : (
              <p className="text-[11px] font-mono text-[var(--warning)]">Processing intelligence…</p>
            )}
          </div>

          {/* Transcript feed */}
          <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-h-0">
            {visible.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                <div className="atlas-idle-ring" />
                <p className="text-[10px] font-mono text-[var(--text-lo)] tracking-widest uppercase">Transcript awaiting input</p>
                <p className="text-[11px] text-[var(--text-mid)] max-w-sm leading-relaxed">
                  {wakeEnabled
                    ? 'Atlas is always listening for your wake word. Say "Hey Atlas" followed by your command to get started.'
                    : 'Press the microphone or the ATLAS AI button in the header to begin a voice session.'}
                </p>
              </div>
            ) : (
              visible.map((line, i) => (
                <div
                  key={`${line.at}-${i}`}
                  className={`stream-in flex ${line.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <span className={`max-w-[75%] rounded border px-3 py-2 text-[12px] leading-snug ${
                    line.role === 'user'
                      ? 'border-[rgba(46,230,168,0.3)] bg-[rgba(46,230,168,0.07)] text-[var(--text-hi)]'
                      : 'border-[rgba(56,232,255,0.3)] bg-[rgba(56,232,255,0.07)] text-[var(--text-hi)]'
                  }`}>
                    <span className={`block text-[8px] font-mono tracking-[0.22em] mb-0.5 ${line.role === 'user' ? 'text-[var(--positive)]' : 'text-[var(--accent)]'}`}>
                      {line.role === 'user' ? 'YOU' : 'ATLAS'}
                    </span>
                    {line.text}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Quick command chips */}
          <div className="shrink-0 border-t border-[var(--line)] pt-3">
            <p className="text-[8px] font-mono tracking-[0.22em] text-[var(--text-lo)] mb-2">QUICK COMMANDS</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_COMMANDS.map(q => (
                <span
                  key={q.label}
                  className="rounded border border-[var(--line)] px-2.5 py-1 text-[9px] font-mono text-[var(--text-lo)] tracking-wide cursor-default hover:border-[rgba(56,232,255,0.3)] hover:text-[var(--accent)] transition-colors"
                  title={q.cmd}
                >
                  {q.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Command guide */}
        <div className="w-72 shrink-0 border-l border-[var(--line)] flex flex-col">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between shrink-0">
            <p className="text-[9px] font-mono tracking-[0.22em] text-[var(--text-lo)] uppercase">Voice Command Reference</p>
            <button
              onClick={() => setShowGuide(v => !v)}
              className={`text-[8px] font-mono tracking-[0.18em] px-2 py-0.5 rounded border transition-colors ${
                showGuide
                  ? 'border-[rgba(56,232,255,0.4)] text-[var(--accent)] bg-[rgba(56,232,255,0.08)]'
                  : 'border-[var(--line)] text-[var(--text-lo)]'
              }`}
            >
              {showGuide ? 'HIDE' : 'SHOW'}
            </button>
          </div>

          {showGuide ? (
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <AtlasCommandGuide />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <AtlasCommandGuide compact />
              <div className="mt-4 rounded border border-[var(--line)] p-3 bg-[rgba(56,232,255,0.03)]">
                <p className="text-[9px] font-mono tracking-[0.18em] text-[var(--accent)] mb-2">HOW IT WORKS</p>
                <ol className="space-y-2">
                  {[
                    'Say "Hey Atlas" — wake word detected automatically',
                    'Atlas greets you and begins listening',
                    'Speak your command naturally',
                    'Atlas executes: globe focuses, charts open, events load',
                    'Voice response confirms what was done',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-[10px] text-[var(--text-mid)]">
                      <span className="text-[var(--accent)] font-mono shrink-0">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

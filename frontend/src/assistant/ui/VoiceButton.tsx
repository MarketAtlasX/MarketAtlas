import { Mic, Square } from 'lucide-react'
import { useAssistantState } from '../state/AssistantStateContext'
import { useVoiceAssistant } from '../voice/useVoiceAssistant'

export function VoiceButton() {
  const { state } = useAssistantState()
  const { active, start, stop } = useVoiceAssistant()

  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
  const listening = state === 'LISTENING'
  const busy = state === 'THINKING' || state === 'SPEAKING'

  const toggle = () => {
    if (active) {
      stop()
    } else {
      void start()
    }
  }

  return (
    <div className="relative flex flex-col items-center gap-3">
      {listening && (
        <span className="absolute -inset-3 rounded-full border border-[rgba(46,230,168,0.4)] animate-ping" />
      )}

      <button
        onClick={toggle}
        disabled={!supported}
        aria-label="Toggle Atlas voice"
        className={`relative flex h-16 w-16 items-center justify-center rounded-full border transition-all duration-300 ${
          active
            ? 'border-[rgba(46,230,168,0.5)] bg-[rgba(46,230,168,0.08)] text-[var(--positive)] glow-positive'
            : 'border-[rgba(56,232,255,0.35)] bg-[rgba(56,232,255,0.06)] text-[var(--accent)] hover:bg-[rgba(56,232,255,0.12)]'
        } ${busy ? 'animate-pulse' : ''} disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {active ? <Square size={20} /> : <Mic size={22} />}
      </button>

      <span className="text-[9px] font-mono tracking-[0.25em] text-[var(--text-lo)] uppercase">
        {active ? (listening ? 'Listening' : busy ? 'Working' : 'Live') : supported ? 'Talk to Atlas' : 'Voice unavailable'}
      </span>
    </div>
  )
}

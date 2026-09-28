import { Mic, MicOff, RadioTower } from 'lucide-react'
import { useAssistantState } from '../state/AssistantStateContext'
import { useVoiceAssistant } from '../voice/useVoiceAssistant'
import { ASSISTANT_STATE_TONE } from '../state/assistantState'

export function VoiceButton() {
  const { state } = useAssistantState()
  const { active, wake, wakeEnabled, start, stop } = useVoiceAssistant()
  const tone = ASSISTANT_STATE_TONE[state]
  const wakeStandby = !active && wake === 'listening'

  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
  const listening = state === 'LISTENING'

  const toggle = () => {
    if (active) stop()
    else void start()
  }

  return (
    <div className="relative flex flex-col items-center gap-3">
      {listening && (
        <span className="absolute -inset-3 rounded-full border border-[rgba(46,230,168,0.4)] animate-ping" />
      )}
      {wakeStandby && !active && (
        <span className="absolute -inset-5 rounded-full border border-[rgba(56,232,255,0.15)] animate-pulse" />
      )}

      <button
        onClick={toggle}
        disabled={!supported}
        aria-label={active ? 'Stop Atlas' : 'Activate Atlas'}
        className={`relative flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all duration-300 ${
          active
            ? 'border-[rgba(46,230,168,0.5)] bg-[rgba(46,230,168,0.08)] text-[var(--positive)] shadow-[0_0_28px_rgba(46,230,168,0.25)]'
            : wakeStandby
              ? 'border-[rgba(56,232,255,0.35)] bg-[rgba(56,232,255,0.06)] text-[var(--accent)]'
              : 'border-[rgba(56,232,255,0.35)] bg-[rgba(56,232,255,0.06)] text-[var(--accent)] hover:bg-[rgba(56,232,255,0.12)]'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
        style={active || wakeStandby ? { boxShadow: `0 0 24px ${tone}22` } : undefined}
      >
        {active
          ? <MicOff size={18} />
          : wakeStandby
            ? <RadioTower size={18} className="animate-pulse" />
            : <Mic size={18} />}
      </button>

      <span className="text-[9px] font-mono tracking-[0.25em] text-[var(--text-lo)] uppercase">
        {active
          ? 'Listening — speak now'
          : wakeStandby
            ? 'Say "Hey Atlas"'
            : state === 'ERROR'
              ? 'Retry ATLAS'
              : supported
                ? 'Tap or say "Hey Atlas"'
                : 'Voice unavailable'}
      </span>

      {wakeEnabled && wakeStandby && (
        <span className="text-[8px] font-mono tracking-[0.18em] text-[rgba(56,232,255,0.45)]">
          WAKE WORD ARMED
        </span>
      )}
    </div>
  )
}

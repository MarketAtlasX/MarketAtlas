import { useAssistantState } from '../state/AssistantStateContext'
import { ASSISTANT_STATE_LABEL, ASSISTANT_STATE_TONE } from '../state/assistantState'

export function AssistantHUD() {
  const { state } = useAssistantState()
  const tone = ASSISTANT_STATE_TONE[state]

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[rgba(6,12,18,0.7)] px-3 py-1 backdrop-blur-md">
        <span
          className="relative inline-flex h-2 w-2"
          style={{ color: tone }}
        >
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-60"
            style={{ background: tone, boxShadow: `0 0 10px ${tone}` }}
          />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: tone }} />
        </span>
        <span className="text-[10px] font-mono tracking-[0.3em]" style={{ color: tone }}>
          {ASSISTANT_STATE_LABEL[state]}
        </span>
      </div>
      <div className="text-sm font-semibold tracking-[0.35em] text-[var(--text-hi)]">
        MARKET<span className="text-[var(--accent)] text-glow">ATLAS</span>
      </div>
      <div className="text-[8px] font-mono tracking-[0.3em] text-[var(--text-lo)] uppercase">
        Global Intelligence System
      </div>
    </div>
  )
}

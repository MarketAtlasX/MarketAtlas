import { createContext, useCallback, useContext, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import type { AssistantState, AtlasVisualMode } from './assistantState'

interface AssistantContextValue {
  state: AssistantState
  setState: (state: AssistantState) => void
  mode: AtlasVisualMode
  setMode: (mode: AtlasVisualMode) => void
  amplitudeRef: MutableRefObject<number>
  setAmplitude: (value: number) => void
}

const AssistantStateContext = createContext<AssistantContextValue | null>(null)

export function AssistantStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AssistantState>('IDLE')
  const [mode, setMode] = useState<AtlasVisualMode>('orb')
  const amplitudeRef = useRef(0)

  const setAmplitude = useCallback((value: number) => {
    amplitudeRef.current = value
  }, [])

  const value = useMemo(
    () => ({ state, setState, mode, setMode, amplitudeRef, setAmplitude }),
    [state, mode, setAmplitude],
  )

  return <AssistantStateContext.Provider value={value}>{children}</AssistantStateContext.Provider>
}

export function useAssistantState(): AssistantContextValue {
  const context = useContext(AssistantStateContext)
  if (!context) {
    throw new Error('useAssistantState must be used inside AssistantStateProvider')
  }
  return context
}

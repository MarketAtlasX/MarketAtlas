export type TranscriptRole = 'user' | 'atlas'

export interface TranscriptLine {
  role: TranscriptRole
  text: string
  at: number
}

type Listener = (lines: TranscriptLine[]) => void

let lines: TranscriptLine[] = []
const listeners = new Set<Listener>()

export const transcriptBus = {
  get current(): TranscriptLine[] {
    return lines
  },
  push(role: TranscriptRole, text: string): void {
    lines = [...lines, { role, text, at: Date.now() }].slice(-20)
    listeners.forEach(listener => listener(lines))
  },
  clear(): void {
    lines = []
    listeners.forEach(listener => listener(lines))
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    listener(lines)
    return () => {
      listeners.delete(listener)
    }
  },
}

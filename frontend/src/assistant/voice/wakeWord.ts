/**
 * useWakeWord — Always-on "Hey Atlas" / "Atlas" wake word detector.
 *
 * Uses the Web Speech API in continuous mode with very low overhead:
 * - Only runs when the main voice assistant is NOT already active
 * - Detects "hey atlas", "atlas", "hey at last" (common misrecognition) etc.
 * - On detection: fires onWake callback and stops itself until reset
 *
 * The main VoiceAssistant takes over after wake detection.
 */

export type WakeWordStatus = 'inactive' | 'listening' | 'error' | 'unsupported'

export interface WakeWordOptions {
  onWake: () => void
  onStatusChange?: (status: WakeWordStatus) => void
}

const WAKE_PATTERNS = [
  /\bhey\s+atlas\b/i,
  /\bhi\s+atlas\b/i,
  /\bokay\s+atlas\b/i,
  /\bok\s+atlas\b/i,
  /\batlas\b/i,       // bare "atlas" also works (low false-positive in practice)
  /\bhey\s+at\s+last\b/i,  // common mishear
  /\bhat\s+less\b/i,
]

function containsWakeWord(text: string): boolean {
  const lower = text.toLowerCase().trim()
  return WAKE_PATTERNS.some(p => p.test(lower))
}

export class WakeWordDetector {
  private recognition: SpeechRecognition | null = null
  private active = false
  private options: WakeWordOptions
  private restartTimer: ReturnType<typeof setTimeout> | null = null
  private status: WakeWordStatus = 'inactive'

  constructor(options: WakeWordOptions) {
    this.options = options
  }

  private setStatus(s: WakeWordStatus) {
    this.status = s
    this.options.onStatusChange?.(s)
  }

  start(): boolean {
    if (this.active) return true

    const SpeechRec = (window as unknown as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition

    if (!SpeechRec) {
      this.setStatus('unsupported')
      return false
    }

    this.active = true
    this._startRecognition(SpeechRec)
    return true
  }

  private _startRecognition(SpeechRec: new () => SpeechRecognition) {
    if (!this.active) return

    const rec = new SpeechRec()
    rec.lang = 'en-US'
    rec.continuous = false     // one utterance at a time — lower CPU than continuous
    rec.interimResults = false
    rec.maxAlternatives = 3

    rec.onstart = () => {
      this.setStatus('listening')
    }

    rec.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = 0; i < event.results.length; i++) {
        for (let j = 0; j < event.results[i].length; j++) {
          const transcript = event.results[i][j].transcript
          if (containsWakeWord(transcript)) {
            this.recognition = null
            rec.abort()
            this.setStatus('inactive')
            this.options.onWake()
            return
          }
        }
      }
    }

    rec.onend = () => {
      // Auto-restart after a short pause to avoid tight loops
      if (this.active) {
        this.restartTimer = setTimeout(() => {
          if (this.active) {
            this._startRecognition(SpeechRec)
          }
        }, 300)
      }
    }

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        this.active = false
        this.setStatus('error')
        return
      }
      // network / no-speech errors: just restart
      if (this.active) {
        this.restartTimer = setTimeout(() => {
          if (this.active) this._startRecognition(SpeechRec)
        }, 800)
      }
    }

    this.recognition = rec
    try {
      rec.start()
    } catch {
      // Ignore "already started" errors
    }
  }

  stop() {
    this.active = false
    if (this.restartTimer !== null) {
      clearTimeout(this.restartTimer)
      this.restartTimer = null
    }
    try {
      this.recognition?.abort()
    } catch {
      // ignore
    }
    this.recognition = null
    this.setStatus('inactive')
  }

  isActive() {
    return this.active
  }

  getStatus() {
    return this.status
  }
}

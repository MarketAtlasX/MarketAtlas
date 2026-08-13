export {}

declare global {
  interface SpeechRecognition extends EventTarget {
    lang: string
    continuous: boolean
    interimResults: boolean
    maxAlternatives: number
    onstart: (() => void) | null
    onend: (() => void) | null
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
    onresult: ((event: SpeechRecognitionEvent) => void) | null
    start(): void
    stop(): void
    abort(): void
  }

  interface SpeechRecognitionConstructor {
    new (): SpeechRecognition
  }

  var SpeechRecognition: SpeechRecognitionConstructor | undefined
  var webkitSpeechRecognition: SpeechRecognitionConstructor | undefined
}

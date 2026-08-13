export function getSpeechRecognition(): SpeechRecognition | null {
  const ctor = (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition
    ?? (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition
  return ctor ? new ctor() : null
}

export function warmUpVoices(): void {
  const synth = window.speechSynthesis
  if (synth) {
    synth.getVoices()
    synth.addEventListener?.('voiceschanged', () => synth.getVoices())
  }
}

export function pickFemaleVoice(): SpeechSynthesisVoice | null {
  const synth = window.speechSynthesis
  if (!synth) return null
  const voices = synth.getVoices()
  const female = voices.filter(v =>
    /female|woman|samantha|victoria|zira|allison|ava|karen|moira|tessa|jenny|aria|susan|female/i.test(v.name),
  )
  if (female.length > 0) return female[0]
  return voices.find(v => v.lang.startsWith('en')) ?? null
}

export interface SpeakHandlers {
  onStart?: () => void
  onEnd?: () => void
}

export function speak(text: string, handlers: SpeakHandlers = {}): () => void {
  const synth = window.speechSynthesis
  if (!synth) {
    handlers.onEnd?.()
    return () => {}
  }

  const utterance = new SpeechSynthesisUtterance(text)
  const voice = pickFemaleVoice()
  if (voice) {
    utterance.voice = voice
  }
  utterance.rate = 0.98
  utterance.pitch = 1.0
  utterance.volume = 1

  let finished = false
  utterance.onstart = () => handlers.onStart?.()
  utterance.onend = () => {
    if (finished) return
    finished = true
    handlers.onEnd?.()
  }
  utterance.onerror = () => {
    if (finished) return
    finished = true
    handlers.onEnd?.()
  }

  synth.cancel()
  synth.speak(utterance)

  return () => {
    finished = true
    synth.cancel()
  }
}

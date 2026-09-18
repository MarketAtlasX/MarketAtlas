import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAssistantState } from '../state/AssistantStateContext'
import { RealtimeVoice } from './RealtimeVoice'
import type { AtlasEvent } from './atlasEvents'
import { AudioMeter } from './audioMeter'
import { atlasBrainOffline } from '../brain/atlasBrain'
import { transcriptBus } from '../brain/transcriptBus'
import { getSpeechRecognition, speak, warmUpVoices } from './browserSpeech'
import { visualizationBus } from '../commands/visualizationBus'
import { useAtlasAgent } from '../agent/useAtlasAgent'
import { WakeWordDetector, type WakeWordStatus } from './wakeWord'

export type VoiceSource = 'offline' | 'realtime'

export interface VoiceAssistantApi {
  active: boolean
  source: VoiceSource
  wake: WakeWordStatus
  wakeEnabled: boolean
  setWakeEnabled: (enabled: boolean) => void
  start: () => Promise<void>
  stop: () => void
}

const GREETINGS: string[] = [
  'Atlas here. What would you like me to investigate?',
  'I am listening. How can I help?',
  'Atlas at your command. Tell me what you need.',
  'Ready. What should I focus the atlas on?',
]

function pickGreeting(): string {
  return GREETINGS[Math.floor(Math.random() * GREETINGS.length)]
}

const VoiceAssistantContext = createContext<VoiceAssistantApi | null>(null)

export function VoiceAssistantProvider({ children }: { children: ReactNode }) {
  const { setState, setAmplitude, setMode, setOverlayOpen } = useAssistantState()
  const { execute } = useAtlasAgent()
  const voiceRef = useRef<RealtimeVoice | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const meterRef = useRef<AudioMeter | null>(null)
  const micRef = useRef<MediaStream | null>(null)
  const cancelSpeechRef = useRef<(() => void) | null>(null)
  const realtimeTranscriptRef = useRef('')
  const activeRef = useRef(false)
  const wakeDetectorRef = useRef<WakeWordDetector | null>(null)
  const [active, setActive] = useState(false)
  const [source, setSource] = useState<VoiceSource>('offline')
  const [wake, setWake] = useState<WakeWordStatus>('inactive')
  const [wakeEnabled, setWakeEnabledState] = useState(true)

  const wakeEnabledRef = useRef(wakeEnabled)
  wakeEnabledRef.current = wakeEnabled
  const handleWakeRef = useRef<() => void>(() => {})
  const startRef = useRef<() => Promise<void>>(async () => {})

  const startMeter = useCallback(
    (stream: MediaStream) => {
      meterRef.current?.stop()
      meterRef.current = new AudioMeter(setAmplitude)
      meterRef.current.start(stream)
    },
    [setAmplitude],
  )

  const stopWakeDetector = useCallback(() => {
    wakeDetectorRef.current?.stop()
    wakeDetectorRef.current = null
    setWake('inactive')
  }, [])

  const startWakeDetector = useCallback(() => {
    if (!wakeEnabledRef.current || activeRef.current) return
    if (wakeDetectorRef.current?.isActive()) return
    const detector = new WakeWordDetector({
      onStatusChange: setWake,
      onWake: () => handleWakeRef.current(),
    })
    wakeDetectorRef.current = detector
    detector.start()
  }, [])

  const resumeWake = useCallback(() => {
    startWakeDetector()
  }, [startWakeDetector])

  const handleUtterance = useCallback(
    (transcript: string) => {
      cancelSpeechRef.current?.()
      setState('THINKING')
      transcriptBus.push('user', transcript)

      void execute(transcript).then(execution => {
        window.setTimeout(() => {
          cancelSpeechRef.current = speak(execution.response, {
            onStart: () => {
              setState('SPEAKING')
              transcriptBus.push('atlas', execution.response)
            },
            onEnd: () => {
              setState('IDLE')
              cancelSpeechRef.current = null
            },
          })
        }, 500)
      })
    },
    [execute, setState],
  )

  const startOffline = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    micRef.current = stream
    startMeter(stream)
    warmUpVoices()

    const recognition = getSpeechRecognition()
    if (!recognition) {
      micRef.current?.getTracks().forEach(track => track.stop())
      micRef.current = null
      meterRef.current?.stop()
      meterRef.current = null
      activeRef.current = false
      setActive(false)
      setState('IDLE')
      return
    }

    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = event => {
      const last = event.results[event.results.length - 1]
      const text = last?.[0]?.transcript ?? ''
      if (text.trim()) {
        handleUtterance(text)
      }
    }
    recognition.onend = () => {
      if (activeRef.current) {
        try {
          recognition.start()
        } catch {
          // restart failed, leave idle
        }
      } else {
        setState('IDLE')
      }
    }
    recognition.onerror = event => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        activeRef.current = false
        setActive(false)
        setState('ERROR')
        return
      }
      if (activeRef.current) {
        try {
          recognition.start()
        } catch {
          // ignore
        }
      }
    }

    recognitionRef.current = recognition
    recognition.start()
    setState('LISTENING')
  }, [handleUtterance, setState, startMeter])

  const handleAtlasEvent = useCallback(
    (event: AtlasEvent) => {
      switch (event.type) {
        case 'VOICE_STARTED':
          setState('LISTENING')
          break
        case 'VOICE_STOPPED':
          setState('THINKING')
          break
        case 'THINKING_STARTED':
          setState('THINKING')
          break
        case 'RESPONSE_STARTED':
          setState('SPEAKING')
          break
        case 'TRANSCRIPT_DELTA':
          realtimeTranscriptRef.current += event.text
          break
        case 'RESPONSE_FINISHED': {
          const text = realtimeTranscriptRef.current.trim()
          realtimeTranscriptRef.current = ''
          if (text) {
            transcriptBus.push('atlas', text)
            const response = atlasBrainOffline(text)
            void execute(text)
            if (response.visualization) {
              visualizationBus.drive(response.visualization)
              setMode('globe')
            }
          }
          setState('IDLE')
          break
        }
        case 'ERROR':
          console.error('[ATLAS]', event.message)
          setState('ERROR')
          break
      }
    },
    [execute, setMode, setState],
  )

  const start = useCallback(async () => {
    if (activeRef.current) return
    stopWakeDetector()
    activeRef.current = true
    setActive(true)
    setState('LISTENING')

    const voice = new RealtimeVoice()
    voiceRef.current = voice

    try {
      await voice.connect({ onEvent: handleAtlasEvent })
      setSource('realtime')
      if (voice.microphone) {
        startMeter(voice.microphone)
      }
      setState('LISTENING')
    } catch {
      voice.disconnect()
      voiceRef.current = null
      setSource('offline')
      try {
        await startOffline()
      } catch {
        activeRef.current = false
        setActive(false)
        setState('ERROR')
      }
    }
  }, [handleAtlasEvent, setState, startMeter, startOffline, stopWakeDetector])

  startRef.current = start

  const handleWake = useCallback(() => {
    stopWakeDetector()
    setOverlayOpen(true)
    cancelSpeechRef.current = speak(pickGreeting(), {
      onStart: () => setState('SPEAKING'),
      onEnd: () => {
        cancelSpeechRef.current = null
        void startRef.current()
      },
    })
  }, [setOverlayOpen, setState, stopWakeDetector])

  handleWakeRef.current = handleWake

  const stop = useCallback(() => {
    activeRef.current = false
    setActive(false)
    cancelSpeechRef.current?.()
    cancelSpeechRef.current = null
    recognitionRef.current?.abort()
    voiceRef.current?.disconnect()
    meterRef.current?.stop()
    micRef.current?.getTracks().forEach(track => track.stop())
    voiceRef.current = null
    recognitionRef.current = null
    meterRef.current = null
    micRef.current = null
    realtimeTranscriptRef.current = ''
    setAmplitude(0)
    setState('IDLE')
    resumeWake()
  }, [resumeWake, setAmplitude, setState])

  useEffect(() => {
    startWakeDetector()
    return () => {
      stopWakeDetector()
    }
  }, [startWakeDetector, stopWakeDetector])

  useEffect(() => {
    if (wakeEnabled) {
      startWakeDetector()
    } else {
      stopWakeDetector()
    }
  }, [wakeEnabled, startWakeDetector, stopWakeDetector])

  const setWakeEnabled = useCallback((enabled: boolean) => {
    setWakeEnabledState(enabled)
  }, [])

  const value = useMemo<VoiceAssistantApi>(
    () => ({
      active,
      source,
      wake,
      wakeEnabled,
      setWakeEnabled,
      start,
      stop,
    }),
    [active, source, wake, wakeEnabled, setWakeEnabled, start, stop],
  )

  return <VoiceAssistantContext.Provider value={value}>{children}</VoiceAssistantContext.Provider>
}

export function useVoiceAssistant(): VoiceAssistantApi {
  const context = useContext(VoiceAssistantContext)
  if (!context) {
    throw new Error('useVoiceAssistant must be used inside VoiceAssistantProvider')
  }
  return context
}
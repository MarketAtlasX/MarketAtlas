import { useCallback, useEffect, useRef, useState } from 'react'
import { useAssistantState } from '../state/AssistantStateContext'
import { commandBus } from '../commands/commandBus'
import { RealtimeVoice } from './RealtimeVoice'
import { AudioMeter } from './audioMeter'
import { atlasBrain } from '../brain/atlasBrain'
import { transcriptBus } from '../brain/transcriptBus'
import { getSpeechRecognition, speak, warmUpVoices } from './browserSpeech'

export interface VoiceAssistantApi {
  active: boolean
  source: 'offline' | 'realtime'
  start: () => Promise<void>
  stop: () => void
}

export function useVoiceAssistant(): VoiceAssistantApi {
  const { setState, setAmplitude, setMode } = useAssistantState()
  const voiceRef = useRef<RealtimeVoice | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const meterRef = useRef<AudioMeter | null>(null)
  const micRef = useRef<MediaStream | null>(null)
  const cancelSpeechRef = useRef<(() => void) | null>(null)
  const activeRef = useRef(false)
  const [active, setActive] = useState(false)
  const [source, setSource] = useState<'offline' | 'realtime'>('offline')

  const startMeter = useCallback(
    (stream: MediaStream) => {
      meterRef.current?.stop()
      meterRef.current = new AudioMeter(setAmplitude)
      meterRef.current.start(stream)
    },
    [setAmplitude],
  )

  const handleUtterance = useCallback(
    (transcript: string) => {
      cancelSpeechRef.current?.()
      setState('THINKING')
      transcriptBus.push('user', transcript)

      const response = atlasBrain(transcript)
      response.commands.forEach(command => commandBus.emit(command))
      if (response.commands.length > 0) {
        setMode('globe')
      }

      window.setTimeout(() => {
        cancelSpeechRef.current = speak(response.text, {
          onStart: () => {
            setState('SPEAKING')
            transcriptBus.push('atlas', response.text)
          },
          onEnd: () => {
            setState('IDLE')
            cancelSpeechRef.current = null
          },
        })
      }, 500)
    },
    [setMode, setState],
  )

  const startOffline = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    micRef.current = stream
    startMeter(stream)
    warmUpVoices()

    const recognition = getSpeechRecognition()
    if (!recognition) {
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
    recognition.onerror = () => {
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

  const handleRealtimeEvent = useCallback(
    (event: Record<string, unknown>) => {
      switch (event.type) {
        case 'input_audio_buffer.speech_started':
          setState('LISTENING')
          break
        case 'input_audio_buffer.speech_stopped':
          setState('THINKING')
          break
        case 'response.created':
          setState('THINKING')
          break
        case 'response.audio.delta':
          setState('SPEAKING')
          break
        case 'response.done':
          setState('IDLE')
          break
        default:
          break
      }
    },
    [setState],
  )

  const start = useCallback(async () => {
    if (activeRef.current) return
    activeRef.current = true
    setActive(true)
    setState('LISTENING')

    const voice = new RealtimeVoice()
    voiceRef.current = voice

    try {
      await voice.connect(handleRealtimeEvent)
      setSource('realtime')
      if (voice.microphone) {
        startMeter(voice.microphone)
      }
      setState('LISTENING')
    } catch {
      setSource('offline')
      await startOffline()
    }
  }, [handleRealtimeEvent, setState, startMeter, startOffline])

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
    setAmplitude(0)
    setState('IDLE')
  }, [setAmplitude, setState])

  useEffect(() => stop, [stop])

  return { active, source, start, stop }
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAssistantState } from '../state/AssistantStateContext'
import { commandBus } from '../commands/commandBus'
import { RealtimeVoice } from './RealtimeVoice'
import type { AtlasEvent } from './atlasEvents'
import { AudioMeter } from './audioMeter'
import { atlasBrain, atlasBrainOffline, inferVisualization } from '../brain/atlasBrain'
import { transcriptBus } from '../brain/transcriptBus'
import { getSpeechRecognition, speak, warmUpVoices } from './browserSpeech'
import { visualizationBus } from '../commands/visualizationBus'

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
  const realtimeTranscriptRef = useRef('')
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

      void atlasBrain(transcript).then(response => {
        response.commands.forEach(command => commandBus.emit(command))
        if (response.visualization) {
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
      })
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
            response.commands.forEach(command => commandBus.emit(command))
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
    [setMode, setState],
  )

  const start = useCallback(async () => {
    if (activeRef.current) return
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
  }, [handleAtlasEvent, setState, startMeter, startOffline])

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
  }, [setAmplitude, setState])

  useEffect(() => stop, [stop])

  return { active, source, start, stop }
}

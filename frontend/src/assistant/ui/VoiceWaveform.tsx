import { useEffect, useRef } from 'react'
import { useAssistantState } from '../state/AssistantStateContext'

const BAR_COUNT = 28

export function VoiceWaveform({ className = '' }: { className?: string }) {
  const { state, amplitudeRef } = useAssistantState()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const phaseRef = useRef(0)
  const heightsRef = useRef<number[]>(Array(BAR_COUNT).fill(2))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      const isActive = state === 'LISTENING' || state === 'SPEAKING'
      const amp = amplitudeRef.current
      phaseRef.current += isActive ? 0.08 : 0.02

      const barW = Math.floor(w / BAR_COUNT) - 1
      const gap = 1

      for (let i = 0; i < BAR_COUNT; i++) {
        const t = phaseRef.current + i * 0.38

        let targetH: number
        if (state === 'LISTENING') {
          const wave = Math.sin(t) * 0.5 + Math.sin(t * 2.1) * 0.3 + Math.sin(t * 3.7) * 0.2
          targetH = h * 0.15 + h * 0.65 * (0.5 + wave * 0.5) * (0.3 + amp * 0.7)
        } else if (state === 'SPEAKING') {
          const wave = Math.sin(t * 1.4) * 0.4 + Math.sin(t * 2.8) * 0.35 + Math.sin(t * 0.9) * 0.25
          targetH = h * 0.12 + h * 0.7 * Math.abs(wave) * (0.5 + amp * 0.5)
        } else if (state === 'THINKING' || state === 'ANALYZING') {
          const wave = Math.sin(t * 0.6 + i * 0.4) * 0.5
          targetH = h * 0.12 + h * 0.25 * (0.5 + wave * 0.5)
        } else {
          targetH = 2 + Math.sin(phaseRef.current * 0.3 + i * 0.5) * 1
        }

        // Smooth interpolation
        const prev = heightsRef.current[i]
        heightsRef.current[i] = prev + (targetH - prev) * 0.18

        const barH = heightsRef.current[i]
        const x = i * (barW + gap)
        const y = (h - barH) / 2

        // Color based on state
        let color: string
        if (state === 'LISTENING') {
          const intensity = barH / h
          color = `rgba(46, 230, 168, ${0.4 + intensity * 0.6})`
        } else if (state === 'SPEAKING') {
          const intensity = barH / h
          color = `rgba(56, 232, 255, ${0.35 + intensity * 0.65})`
        } else if (state === 'THINKING' || state === 'ANALYZING') {
          color = `rgba(245, 185, 65, 0.45)`
        } else {
          color = `rgba(97, 199, 182, 0.2)`
        }

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.roundRect(x, y, barW, barH, 2)
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [state, amplitudeRef])

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={64}
      className={`block ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

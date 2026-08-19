import { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import WorldCore, { createIntent, type VisualizationIntent } from './WorldCore'
import { INTENT_CAPTION } from './visualizationIntent'
import { useWorldStore } from '../../stores/WorldStore'
import { formatCommandTime, useClock } from '../../hooks/useClock'

export type GlobeMode = 'world' | 'risk' | 'supply' | 'events' | 'map'

const LEGEND: Partial<Record<GlobeMode, { color: string; label: string }[]>> = {
  risk: [
    { color: '#ff3b30', label: 'CRITICAL' },
    { color: '#ff7a2e', label: 'ELEVATED' },
    { color: '#38e8ff', label: 'STABLE' },
  ],
  map: [
    { color: '#38e8ff', label: 'COUNTRY' },
    { color: '#ffd54a', label: 'HUB' },
    { color: '#ff4d5e', label: 'HOT RISK' },
  ],
  supply: [
    { color: '#38e8ff', label: 'SUPPLY LINK' },
    { color: '#ffd54a', label: 'CORRIDOR' },
  ],
}

interface HolographicGlobeProps {
  mode?: GlobeMode
  onSelect?: (entity: string, lat: number, lng: number) => void
  className?: string
}

function modeToIntent(mode: GlobeMode, selectedEntity: string | null): VisualizationIntent {
  switch (mode) {
    case 'risk':
      return createIntent({ mode: 'risk', scale: 'regional', camera: 'zoom_in', palette: 'risk', transition: 'disintegrate' })
    case 'supply':
      return createIntent({ mode: 'supply', scale: 'global', camera: 'pullback', palette: 'map', transition: 'particle_reform' })
    case 'map':
      return createIntent({ mode: 'map', scale: 'global', camera: 'pullback', palette: 'map', transition: 'particle_reform' })
    case 'events':
      return createIntent({ mode: 'globe', scale: 'global', camera: 'pullback', transition: 'particle_reform' })
    case 'world':
    default:
      return createIntent({
        mode: selectedEntity ? 'country' : 'globe',
        scale: selectedEntity ? 'country' : 'global',
        focus: selectedEntity ? [selectedEntity] : [],
        origin: selectedEntity,
        camera: selectedEntity ? 'zoom_in' : 'pullback',
      })
  }
}

export default function HolographicGlobe({ mode = 'world', onSelect, className = '' }: HolographicGlobeProps) {
  const { state } = useWorldStore()
  const [focusIntent, setFocusIntent] = useState<VisualizationIntent | null>(null)
  const [dragging, setDragging] = useState(false)
  const now = useClock()

  const intent = useMemo(() => {
    if (focusIntent) return focusIntent
    return modeToIntent(mode, state.selectedEntity)
  }, [focusIntent, mode, state.selectedEntity])

  const handleSelect = (entity: string, lat: number, lng: number) => {
    setFocusIntent(
      createIntent({
        mode: 'country',
        scale: 'country',
        focus: [entity],
        origin: entity,
        camera: 'zoom_in',
        caption: `Focus: ${entity}`,
      }),
    )
    onSelect?.(entity, lat, lng)
  }

  const caption = intent.caption ?? INTENT_CAPTION[intent.mode] ?? 'GLOBAL PARTICLE CORE'

  return (
    <div className={`globe-container relative w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 1.5, 6.5], fov: 45, near: 0.1, far: 2000 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
        dpr={[1, 1.6]}
      >
        <WorldCore intent={intent} eventMode={mode === 'events'} onNodeClick={handleSelect} />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableDamping
          dampingFactor={0.06}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          autoRotate={!dragging}
          autoRotateSpeed={0.5}
          minDistance={2.2}
          maxDistance={16}
          onStart={() => setDragging(true)}
          onEnd={() => setDragging(false)}
        />
        <EffectComposer multisampling={4}>
          <Bloom intensity={0.75} luminanceThreshold={0.35} luminanceSmoothing={0.85} mipmapBlur radius={0.78} />
          <Vignette eskil={false} offset={0.22} darkness={0.88} blendFunction={BlendFunction.NORMAL} />
          <Noise opacity={0.05} blendFunction={BlendFunction.SOFT_LIGHT} />
        </EffectComposer>
      </Canvas>
      <div className="absolute bottom-14 left-4 z-10 pointer-events-none select-none font-mono">
        <div key={caption} className="stream-in text-[11px] tracking-[0.3em] text-[var(--accent)] drop-shadow">
          {caption}
          <span className="blink-caret ml-1 inline-block h-3 w-[7px] translate-y-[1px] bg-[var(--accent)]" />
        </div>
        <div className="mt-1 text-[9px] tracking-widest text-[rgba(95,125,153,0.9)]">
          {mode.toUpperCase()} :: {intent.scale.toUpperCase()}
        </div>
        <div className="mt-1 text-[8px] tracking-[0.25em] text-[rgba(95,125,153,0.55)]">
          DRAG TO ORBIT :: SCROLL TO ZOOM
        </div>
      </div>
      {LEGEND[mode] && (
        <div className="absolute bottom-14 right-4 z-10 pointer-events-none select-none font-mono">
          <div className="flex flex-col gap-1">
            {LEGEND[mode]?.map(entry => (
              <div key={entry.label} className="flex items-center gap-2 text-[9px] tracking-[0.2em] text-[rgba(95,125,153,0.9)]">
                <span
                  className="h-[6px] w-[6px] rounded-full"
                  style={{ backgroundColor: entry.color, boxShadow: `0 0 6px ${entry.color}` }}
                />
                {entry.label}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="absolute top-4 right-4 z-10 pointer-events-none select-none font-mono text-[9px] tracking-[0.25em] text-[rgba(95,125,153,0.8)]">
        {formatCommandTime(now)}
      </div>
      <div className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
        <div className="relative h-20 w-20 opacity-25">
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[var(--accent)]" />
          <div className="absolute top-1/2 left-0 w-full h-px -translate-y-1/2 bg-[var(--accent)]" />
          <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 border-t border-l border-[var(--accent)]" />
          <div className="absolute left-1/2 bottom-0 h-2 w-2 -translate-x-1/2 border-b border-l border-[var(--accent)]" />
          <div className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 border-t border-r border-[var(--accent)]" />
          <div className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 border-t border-l border-[var(--accent)]" />
        </div>
      </div>
    </div>
  )
}
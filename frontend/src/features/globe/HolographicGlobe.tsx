import { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import WorldCore, { createIntent, type VisualizationIntent } from './WorldCore'
import { INTENT_CAPTION } from './visualizationIntent'
import { useWorldStore } from '../../stores/WorldStore'

export type GlobeMode = 'world' | 'risk' | 'supply' | 'events' | 'map'

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
          minDistance={2.2}
          maxDistance={16}
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
        </div>
        <div className="mt-1 text-[9px] tracking-widest text-[rgba(95,125,153,0.9)]">
          {mode.toUpperCase()} :: {intent.scale.toUpperCase()}
        </div>
      </div>
    </div>
  )
}
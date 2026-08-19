import { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import WorldCore, { createIntent, type VisualizationIntent } from './WorldCore'
import { useWorldStore } from '../../stores/WorldStore'

export type GlobeMode = 'world' | 'risk' | 'supply' | 'events'

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
      return createIntent({ mode: 'network', scale: 'global', camera: 'pullback', transition: 'particle_reform' })
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

  return (
    <div className={`globe-container relative w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 1.5, 6.5], fov: 45, near: 0.1, far: 2000 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
        dpr={[1, 1.5]}
      >
        <WorldCore intent={intent} eventMode={mode === 'events'} onNodeClick={handleSelect} />
        <OrbitControls
          enablePan={false}
          enableDamping
          dampingFactor={0.06}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          minDistance={2.2}
          maxDistance={16}
          autoRotate
          autoRotateSpeed={0.35}
        />
        <EffectComposer>
          <Bloom intensity={0.45} luminanceThreshold={0.5} luminanceSmoothing={0.9} mipmapBlur radius={0.7} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
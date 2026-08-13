import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useAssistantState } from '../state/AssistantStateContext'
import { OrbParticles } from './OrbParticles'
import './orb.css'

function makeGlowTexture(): THREE.Texture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    grad.addColorStop(0, 'rgba(190, 244, 255, 1)')
    grad.addColorStop(0.25, 'rgba(56, 232, 255, 0.55)')
    grad.addColorStop(0.6, 'rgba(56, 232, 255, 0.12)')
    grad.addColorStop(1, 'rgba(56, 232, 255, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
  }
  const texture = new THREE.CanvasTexture(canvas)
  return texture
}

function CoreGlow() {
  const { state, amplitudeRef } = useAssistantState()
  const spriteRef = useRef<THREE.Sprite>(null)
  const stateRef = useRef(state)
  const smooth = useRef(0)

  useMemo(() => {
    stateRef.current = state
  }, [state])

  const texture = useMemo(() => makeGlowTexture(), [])

  useFrame((_, delta) => {
    if (!spriteRef.current) return
    const t = performance.now() / 1000
    const target = stateRef.current === 'SPEAKING' ? 0.8 + amplitudeRef.current * 0.6 : 0.85
    smooth.current += (target - smooth.current) * (1 - Math.exp(-delta * 6))
    spriteRef.current.scale.setScalar(0.9 + smooth.current * 0.45)
    const mat = spriteRef.current.material as THREE.SpriteMaterial
    mat.opacity = 0.5 + smooth.current * 0.4
    mat.rotation = t * 0.2
  })

  return (
    <sprite ref={spriteRef} scale={1.1}>
      <spriteMaterial map={texture} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.8} />
    </sprite>
  )
}

function OrbRings() {
  const { state, amplitudeRef } = useAssistantState()
  const ringRefs = useRef<(THREE.Mesh | null)[]>([])
  const stateRef = useRef(state)
  const opacity = useRef(0)

  useMemo(() => {
    stateRef.current = state
  }, [state])

  const rings = useMemo(
    () => [
      { radius: 1.62, tilt: [0.42, 0, 0], speed: 0.12 },
      { radius: 1.92, tilt: [0, 0.9, 0.3], speed: -0.07 },
      { radius: 2.2, tilt: [0.9, 0.2, 0], speed: 0.05 },
    ],
    [],
  )

  useFrame((_, delta) => {
    const t = performance.now() / 1000
    const target = stateRef.current === 'THINKING' || stateRef.current === 'ANALYZING' ? 0.5 : stateRef.current === 'IDLE' ? 0.12 : 0.28
    opacity.current += (target - opacity.current) * (1 - Math.exp(-delta * 5))

    rings.forEach((ring, i) => {
      const mesh = ringRefs.current[i]
      if (!mesh) return
      mesh.rotation.z = t * ring.speed
      mesh.rotation.x = ring.tilt[0] + Math.sin(t * 0.4 + i) * 0.1
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.opacity = opacity.current + (stateRef.current === 'SPEAKING' ? amplitudeRef.current * 0.3 : 0)
    })
  })

  return (
    <group>
      {rings.map((ring, i) => (
        <mesh
          key={i}
          ref={el => {
            ringRefs.current[i] = el
          }}
          rotation={ring.tilt as [number, number, number]}
        >
          <torusGeometry args={[ring.radius, 0.004, 12, 160]} />
          <meshBasicMaterial color="#38e8ff" transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  )
}

export function AtlasOrb({ className = '' }: { className?: string }) {
  return (
    <div className={`atlas-orb ${className}`}>
      <Canvas camera={{ position: [0, 0, 3.6], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.4} />
        <CoreGlow />
        <OrbParticles />
        <OrbRings />
        <EffectComposer>
          <Bloom luminanceThreshold={0.15} luminanceSmoothing={0.9} intensity={1.15} mipmapBlur />
        </EffectComposer>
      </Canvas>
    </div>
  )
}

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAssistantState } from '../state/AssistantStateContext'
import type { AssistantState } from '../state/assistantState'
import { ORB_MODE, ORB_VERTEX, ORB_FRAGMENT, createOrbUniforms } from './OrbShader'

const PARTICLE_COUNT = 12000

const STATE_COLORS: Record<AssistantState, [string, string]> = {
  IDLE: ['#38e8ff', '#9adcf0'],
  LISTENING: ['#2ee6a8', '#a8f7e0'],
  THINKING: ['#f5b941', '#ffe1a0'],
  SPEAKING: ['#38e8ff', '#bdf4ff'],
  NAVIGATING: ['#5f7d99', '#b8ccdd'],
  ANALYZING: ['#f5b941', '#ffe1a0'],
  SIMULATING: ['#9adcf0', '#e0f6ff'],
  ERROR: ['#ff4d5e', '#ffb3ba'],
}

export function OrbParticles() {
  const { state, amplitudeRef } = useAssistantState()
  const pointsRef = useRef<THREE.Points>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const groupRef = useRef<THREE.Group>(null)
  const stateRef = useRef<AssistantState>(state)
  const smoothAmp = useRef(0)

  const uniforms = useMemo(() => createOrbUniforms(), [])

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const positions = useMemo(() => {
    const array = new Float32Array(PARTICLE_COUNT * 3)
    const radius = 1.35
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = radius * (0.94 + Math.random() * 0.1)
      array[i3] = r * Math.sin(phi) * Math.cos(theta)
      array[i3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      array[i3 + 2] = r * Math.cos(phi)
    }
    return array
  }, [])

  useFrame((_, delta) => {
    if (!materialRef.current || !groupRef.current) return

    const t = performance.now() / 1000
    const mode = ORB_MODE[stateRef.current]
    const realAmp = amplitudeRef.current

    let targetAmp = realAmp
    if (stateRef.current === 'SPEAKING') {
      targetAmp = Math.max(
        realAmp,
        (0.5 + 0.5 * Math.sin(t * 9.0)) * (0.5 + 0.5 * Math.sin(t * 3.7 + 1.3)),
      )
    } else if (stateRef.current === 'LISTENING') {
      targetAmp = Math.min(1, realAmp * 2.2)
    }

    smoothAmp.current += (targetAmp - smoothAmp.current) * (1 - Math.exp(-delta * 8))

    const [primary, light] = STATE_COLORS[stateRef.current]
    uniforms.uTime.value = t
    uniforms.uMode.value = mode
    uniforms.uAmplitude.value = smoothAmp.current
    uniforms.uColorA.value.set(primary)
    uniforms.uColorB.value.set(light)

    const speed = stateRef.current === 'IDLE' ? 0.12 : stateRef.current === 'THINKING' ? 0.3 : 0.18
    groupRef.current.rotation.y += delta * speed
    groupRef.current.rotation.x = Math.sin(t * 0.1) * 0.05
  })

  return (
    <group ref={groupRef}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={ORB_VERTEX}
          fragmentShader={ORB_FRAGMENT}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}

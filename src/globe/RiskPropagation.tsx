import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface RiskPath {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  intensity: number
  color?: string
}

interface RiskPropagationProps {
  paths: RiskPath[]
  visible?: boolean
}

function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}

const PARTICLE_COUNT_PER_PATH = 20

function RiskPathParticles({ path, radius }: { path: RiskPath; radius: number }) {
  const ref = useRef<THREE.Points>(null)

  const { positions, colors } = useMemo(() => {
    const start = latLngToVec3(path.startLat, path.startLng, radius)
    const end = latLngToVec3(path.endLat, path.endLng, radius)
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
    const dist = start.distanceTo(end)
    mid.normalize().multiplyScalar(radius + dist * 0.25)

    const pos = new Float32Array(PARTICLE_COUNT_PER_PATH * 3)
    const col = new Float32Array(PARTICLE_COUNT_PER_PATH * 3)
    const c = new THREE.Color(path.color || '#ff4444')

    for (let i = 0; i < PARTICLE_COUNT_PER_PATH; i++) {
      const t = i / PARTICLE_COUNT_PER_PATH
      const a = new THREE.Vector3().lerpVectors(start, mid, t)
      const b = new THREE.Vector3().lerpVectors(mid, end, t)
      const p = new THREE.Vector3().lerpVectors(a, b, t)
      pos[i * 3] = p.x
      pos[i * 3 + 1] = p.y
      pos[i * 3 + 2] = p.z
      const alpha = path.intensity
      col[i * 3] = c.r * alpha
      col[i * 3 + 1] = c.g * alpha
      col[i * 3 + 2] = c.b * alpha
    }

    return { positions: pos, colors: col }
  }, [path, radius])

  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.getElapsedTime() * 0.3
      const sizes = ref.current.geometry.attributes.size as THREE.BufferAttribute
      if (sizes) {
        const array = sizes.array as Float32Array
        for (let i = 0; i < PARTICLE_COUNT_PER_PATH; i++) {
          const phase = (i / PARTICLE_COUNT_PER_PATH + t) % 1.0
          array[i] = phase < 0.1 ? 0.08 : 0.02
        }
        sizes.needsUpdate = true
      }
    }
  })

  const sizeArray = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT_PER_PATH)
    for (let i = 0; i < PARTICLE_COUNT_PER_PATH; i++) {
      arr[i] = 0.02
    }
    return arr
  }, [])

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute args={[positions, 3]} attach="attributes-position" count={PARTICLE_COUNT_PER_PATH} />
        <bufferAttribute args={[colors, 3]} attach="attributes-color" count={PARTICLE_COUNT_PER_PATH} />
        <bufferAttribute args={[sizeArray, 1]} attach="attributes-size" count={PARTICLE_COUNT_PER_PATH} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

export default function RiskPropagation({ paths, visible = true }: RiskPropagationProps) {
  const GLOBE_RADIUS = 2.02

  if (!visible || paths.length === 0) return null

  return (
    <group>
      {paths.map((path, i) => (
        <RiskPathParticles key={i} path={path} radius={GLOBE_RADIUS} />
      ))}
    </group>
  )
}

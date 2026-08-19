import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { RouteFlow } from '../features/globe/SceneDirector'

const PER_PATH = 90
const RADIUS = 2.02

function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}

function arcPoints(startLat: number, startLng: number, endLat: number, endLng: number, radius: number): THREE.Vector3[] {
  const start = latLngToVec3(startLat, startLng, radius)
  const end = latLngToVec3(endLat, endLng, radius)
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  const dist = start.distanceTo(end)
  mid.normalize().multiplyScalar(radius + dist * 0.28)

  const points: THREE.Vector3[] = []
  for (let i = 0; i <= PER_PATH; i++) {
    const t = i / PER_PATH
    const a = new THREE.Vector3().lerpVectors(start, mid, t)
    const b = new THREE.Vector3().lerpVectors(mid, end, t)
    points.push(new THREE.Vector3().lerpVectors(a, b, t))
  }
  return points
}

function FlowStream({ flow }: { flow: RouteFlow }) {
  const ref = useRef<THREE.Points>(null)
  const basePoints = useMemo(
    () => arcPoints(flow.startLat, flow.startLng, flow.endLat, flow.endLng, RADIUS),
    [flow.startLat, flow.startLng, flow.endLat, flow.endLng],
  )

  const { positions, colors, sizes } = useMemo(() => {
    const pos = new Float32Array(PER_PATH * 3)
    const col = new Float32Array(PER_PATH * 3)
    const siz = new Float32Array(PER_PATH)
    const c = new THREE.Color(flow.color)
    for (let i = 0; i < PER_PATH; i++) {
      pos[i * 3] = basePoints[i].x
      pos[i * 3 + 1] = basePoints[i].y
      pos[i * 3 + 2] = basePoints[i].z
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
      siz[i] = 0.02
    }
    return { positions: pos, colors: col, sizes: siz }
  }, [basePoints, flow.color])

  const speed = useRef(0.25 + Math.random() * 0.3)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime() * speed.current
    const sizesAttr = ref.current.geometry.attributes.size as THREE.BufferAttribute
    const arr = sizesAttr.array as Float32Array
    for (let i = 0; i < PER_PATH; i++) {
      const phase = (i / PER_PATH + t) % 1
      const head = Math.exp(-Math.pow((phase - 0.35) * 4, 2))
      arr[i] = 0.02 + head * 0.16
    }
    sizesAttr.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute args={[positions, 3]} attach="attributes-position" count={PER_PATH} />
        <bufferAttribute args={[colors, 3]} attach="attributes-color" count={PER_PATH} />
        <bufferAttribute args={[sizes, 1]} attach="attributes-size" count={PER_PATH} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

export interface FlowParticlesProps {
  flows: RouteFlow[]
  visible?: boolean
}

export default function FlowParticles({ flows, visible = true }: FlowParticlesProps) {
  if (!visible || flows.length === 0) return null
  return (
    <group>
      {flows.map((flow, i) => (
        <FlowStream key={i} flow={flow} />
      ))}
    </group>
  )
}
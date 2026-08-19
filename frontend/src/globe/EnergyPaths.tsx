import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import type { RouteFlow } from '../features/globe/SceneDirector'

const RADIUS = 2.03
const STREAM_COUNT = 140
const ARC_SEGMENTS = 90

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
  mid.normalize().multiplyScalar(radius + dist * 0.3)

  const points: THREE.Vector3[] = []
  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    const t = i / ARC_SEGMENTS
    const a = new THREE.Vector3().lerpVectors(start, mid, t)
    const b = new THREE.Vector3().lerpVectors(mid, end, t)
    points.push(new THREE.Vector3().lerpVectors(a, b, t))
  }
  return points
}

function toneColor(tone: string | undefined, fallback: string): THREE.Color {
  switch (tone) {
    case 'gold':
      return new THREE.Color('#ffd54a')
    case 'amber':
      return new THREE.Color('#ff9d3b')
    case 'red':
      return new THREE.Color('#ff4d5e')
    case 'cyan':
      return new THREE.Color('#38e8ff')
    default:
      return new THREE.Color(fallback)
  }
}

function EnergyStream({ flow }: { flow: RouteFlow }) {
  const pointsRef = useRef<THREE.Points>(null)
  const materialRef = useRef<THREE.PointsMaterial>(null)
  const speed = useRef(0.06 + Math.random() * 0.05)

  const base = useMemo(
    () => arcPoints(flow.startLat, flow.startLng, flow.endLat, flow.endLng, RADIUS),
    [flow.startLat, flow.startLng, flow.endLat, flow.endLng],
  )

  const color = useMemo(() => toneColor(flow.tone, flow.color), [flow.tone, flow.color])
  const heat = flow.intensity ?? 0.5

  const positions = useMemo(() => {
    const pos = new Float32Array(STREAM_COUNT * 3)
    for (let i = 0; i < STREAM_COUNT; i++) {
      const t = i / STREAM_COUNT
      const idx = Math.min(base.length - 1, Math.floor(t * (base.length - 1)))
      pos[i * 3] = base[idx].x
      pos[i * 3 + 1] = base[idx].y
      pos[i * 3 + 2] = base[idx].z
    }
    return pos
  }, [base])

  const colors = useMemo(() => {
    const col = new Float32Array(STREAM_COUNT * 3)
    const white = new THREE.Color('#ffffff')
    const c = new THREE.Color()
    for (let i = 0; i < STREAM_COUNT; i++) {
      c.copy(color).lerp(white, Math.random() * 0.4)
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
    }
    return col
  }, [color])

  const sizes = useMemo(() => new Float32Array(STREAM_COUNT).fill(0.028), [])

  const arcLine = useMemo(
    () => arcPoints(flow.startLat, flow.startLng, flow.endLat, flow.endLng, RADIUS - 0.01),
    [flow.startLat, flow.startLng, flow.endLat, flow.endLng],
  )

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (!pointsRef.current || !materialRef.current) return
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = posAttr.array as Float32Array
    const phaseOffset = t * speed.current

    for (let i = 0; i < STREAM_COUNT; i++) {
      const phase = (i / STREAM_COUNT + phaseOffset) % 1
      const idx = Math.min(base.length - 1, Math.floor(phase * (base.length - 1)))
      const p = base[idx]
      const pulse = Math.sin(t * 3 + i * 0.7) * 0.01
      arr[i * 3] = p.x
      arr[i * 3 + 1] = p.y + pulse
      arr[i * 3 + 2] = p.z
    }
    posAttr.needsUpdate = true

    const sizeAttr = pointsRef.current.geometry.attributes.size as THREE.BufferAttribute
    const sizeArr = sizeAttr.array as Float32Array
    for (let i = 0; i < STREAM_COUNT; i++) {
      const phase = (i / STREAM_COUNT + phaseOffset) % 1
      const head = Math.exp(-Math.pow((phase - 0.42) * 5.5, 2))
      sizeArr[i] = 0.02 + head * (0.16 * heat + 0.05)
    }
    sizeAttr.needsUpdate = true

    materialRef.current.opacity = 0.65 + 0.25 * Math.sin(t * 1.2) * heat
  })

  return (
    <group>
      <Line
        points={arcLine}
        color={color}
        lineWidth={Math.max(1, heat * 3)}
        transparent
        opacity={0.32 + heat * 0.35}
      />
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute args={[positions, 3]} attach="attributes-position" count={STREAM_COUNT} />
          <bufferAttribute args={[colors, 3]} attach="attributes-color" count={STREAM_COUNT} />
          <bufferAttribute args={[sizes, 1]} attach="attributes-size" count={STREAM_COUNT} />
        </bufferGeometry>
        <pointsMaterial
          ref={materialRef}
          size={0.04}
          vertexColors
          transparent
          opacity={0.8}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  )
}

export interface EnergyPathsProps {
  flows: RouteFlow[]
  visible?: boolean
}

export default function EnergyPaths({ flows, visible = true }: EnergyPathsProps) {
  if (!visible || flows.length === 0) return null
  return (
    <group>
      {flows.map((flow, i) => (
        <EnergyStream key={i} flow={flow} />
      ))}
    </group>
  )
}
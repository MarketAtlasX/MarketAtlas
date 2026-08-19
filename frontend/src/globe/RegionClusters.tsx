import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { RegionFocus } from '../features/globe/SceneDirector'

const CLUSTER_SIZE = 700
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

function Cluster({ region }: { region: RegionFocus }) {
  const ref = useRef<THREE.Points>(null)

  const center = useMemo(() => latLngToVec3(region.lat, region.lng, RADIUS).normalize(), [region.lat, region.lng])

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(CLUSTER_SIZE * 3)
    const col = new Float32Array(CLUSTER_SIZE * 3)
    const base = new THREE.Color(region.color)
    const c = new THREE.Color()
    const dir = center
    const tangent = new THREE.Vector3(1, 0, 0).cross(dir).normalize()
    const bitangent = new THREE.Vector3().crossVectors(dir, tangent).normalize()

    for (let i = 0; i < CLUSTER_SIZE; i++) {
      const spread = 0.06 + Math.random() * 0.16
      const angle = Math.random() * Math.PI * 2
      const ring = 0.02 + Math.random() * 0.1
      const offset = tangent.clone().multiplyScalar(Math.cos(angle) * ring)
        .add(bitangent.clone().multiplyScalar(Math.sin(angle) * ring))
      const p = dir.clone().add(offset).normalize().multiplyScalar(RADIUS + spread)
      pos[i * 3] = p.x
      pos[i * 3 + 1] = p.y
      pos[i * 3 + 2] = p.z
      c.copy(base).lerp(new THREE.Color('#ffffff'), Math.random() * 0.35)
      c.multiplyScalar(0.7 + Math.random() * 0.5)
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
    }
    return { positions: pos, colors: col }
  }, [center, region.color])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    const pulse = 1 + Math.sin(t * 2.2) * 0.05
    ref.current.scale.setScalar(pulse)
    ref.current.rotation.y += 0.004
  })

  return (
    <points ref={ref} position={[0, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute args={[positions, 3]} attach="attributes-position" count={CLUSTER_SIZE} />
        <bufferAttribute args={[colors, 3]} attach="attributes-color" count={CLUSTER_SIZE} />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
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

export interface RegionClustersProps {
  regions: RegionFocus[]
  visible?: boolean
}

export default function RegionClusters({ regions, visible = true }: RegionClustersProps) {
  if (!visible || regions.length === 0) return null
  return (
    <group>
      {regions.map((region, i) => (
        <Cluster key={`${region.label ?? 'region'}-${i}`} region={region} />
      ))}
    </group>
  )
}
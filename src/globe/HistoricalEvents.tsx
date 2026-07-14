import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface HistoricalEvent {
  lat: number
  lng: number
  year: number
  title: string
  severity: number
  color?: string
  isActive?: boolean
}

interface HistoricalEventsProps {
  events: HistoricalEvent[]
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

function HistoricalEventPoint({ event: e, radius }: { event: HistoricalEvent; radius: number }) {
  const ringRef = useRef<THREE.Mesh>(null)
  const pos = useMemo(() => latLngToVec3(e.lat, e.lng, radius), [e.lat, e.lng, radius])
  const color = useMemo(() => new THREE.Color(e.color || '#a855f7'), [e.color])
  const size = 0.04 + e.severity * 0.01

  useFrame(({ clock }) => {
    if (ringRef.current) {
      const t = clock.getElapsedTime() * 0.5
      const scale = 1 + Math.sin(t) * 1.5
      ringRef.current.scale.setScalar(scale)
      const mat = ringRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = Math.max(0, 0.3 - (scale - 1) * 0.15)
    }
  })

  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[size, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>
      <mesh ref={ringRef}>
        <sphereGeometry args={[size * 2, 8, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

export default function HistoricalEvents({ events, visible = true }: HistoricalEventsProps) {
  const GLOBE_RADIUS = 2.03

  if (!visible || events.length === 0) return null

  return (
    <group>
      {events.map((e, i) => (
        <HistoricalEventPoint key={i} event={e} radius={GLOBE_RADIUS} />
      ))}
    </group>
  )
}

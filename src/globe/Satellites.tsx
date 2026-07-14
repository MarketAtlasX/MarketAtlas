import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'

interface Satellite {
  lat: number
  lng: number
  altitude: number
  speed: number
  inclination: number
  label?: string
}

const satellites: Satellite[] = [
  { lat: 0, lng: 0, altitude: 2.8, speed: 0.02, inclination: 0.3 },
  { lat: 0, lng: 120, altitude: 3.0, speed: -0.015, inclination: 0.5 },
  { lat: 0, lng: 240, altitude: 2.9, speed: 0.025, inclination: 0.7 },
  { lat: 0, lng: 60, altitude: 3.2, speed: -0.02, inclination: 0.4 },
  { lat: 0, lng: 180, altitude: 3.1, speed: 0.018, inclination: 0.6 },
  { lat: 0, lng: 300, altitude: 2.85, speed: -0.022, inclination: 0.35 },
]

function SatelliteMesh({ data }: { data: Satellite }) {
  const ref = useRef<THREE.Group>(null)
  const startLng = data.lng

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * data.speed
    }
  })

  return (
    <group ref={ref} rotation={[data.inclination, startLng * (Math.PI / 180), 0]}>
      <mesh>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#00ddff" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial
          color="#0088ff"
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

function OrbitRing({ data }: { data: Satellite }) {
  const radius = data.altitude
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const segments = 64
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2
      pts.push(new THREE.Vector3(
        radius * Math.cos(theta),
        0,
        radius * Math.sin(theta),
      ))
    }
    return pts
  }, [radius])

  return (
    <group rotation={[data.inclination, 0, 0]}>
      <Line
        points={points}
        color="#004488"
        lineWidth={1}
        transparent
        opacity={0.15}
      />
    </group>
  )
}

export default function Satellites() {
  return (
    <group>
      {satellites.map((s, i) => (
        <group key={i}>
          <OrbitRing data={s} />
          <SatelliteMesh data={s} />
        </group>
      ))}
    </group>
  )
}

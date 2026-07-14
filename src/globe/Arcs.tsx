import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'

interface ArcData {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  color: string
  altitude?: number
  stroke?: number
  dashLength?: number
  dashGap?: number
  dashAnimateTime?: number
}

interface ArcsProps {
  data: ArcData[]
  visible?: boolean
}

function latLngToPosition(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}

function computeArcPoints(
  startLat: number, startLng: number,
  endLat: number, endLng: number,
  radius: number, segments: number = 60,
): THREE.Vector3[] {
  const start = latLngToPosition(startLat, startLng, radius)
  const end = latLngToPosition(endLat, endLng, radius)
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  const dist = start.distanceTo(end)
  mid.normalize().multiplyScalar(radius + dist * 0.35)

  const points: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const a = new THREE.Vector3().lerpVectors(start, mid, t)
    const b = new THREE.Vector3().lerpVectors(mid, end, t)
    points.push(new THREE.Vector3().lerpVectors(a, b, t))
  }
  return points
}

function ArcLine({ arc, radius }: { arc: ArcData; radius: number }) {
  const points = useMemo(
    () => computeArcPoints(arc.startLat, arc.startLng, arc.endLat, arc.endLng, radius),
    [arc.startLat, arc.startLng, arc.endLat, arc.endLng, radius],
  )

  const dashOffset = useRef(0)

  useFrame((_, delta) => {
    dashOffset.current += delta * 2
  })

  const color = useMemo(() => new THREE.Color(arc.color), [arc.color])
  const stroke = arc.stroke || 0.6
  const opacity = Math.min(1, stroke * 0.9)

  return (
    <Line
      points={points}
      color={color}
      lineWidth={Math.max(1, stroke * 3)}
      transparent
      opacity={opacity}
      dashed
      dashSize={arc.dashLength || 0.25}
      gapSize={arc.dashGap || 0.1}
      dashScale={50}
      dashOffset={dashOffset.current}
    />
  )
}

export default function Arcs({ data, visible = true }: ArcsProps) {
  const RADIUS = 2

  if (!visible || data.length === 0) return null

  return (
    <group>
      {data.map((arc, i) => (
        <ArcLine key={i} arc={arc} radius={RADIUS} />
      ))}
    </group>
  )
}

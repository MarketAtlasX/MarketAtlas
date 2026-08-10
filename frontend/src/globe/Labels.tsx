import { useMemo } from 'react'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

interface LabelData {
  lat: number
  lng: number
  text: string
  size?: number
  color?: string
  altitude?: number
}

interface LabelsProps {
  data: LabelData[]
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

function Label({ data: d, radius }: { data: LabelData; radius: number }) {
  const pos = useMemo(() => latLngToVec3(d.lat, d.lng, radius), [d.lat, d.lng, radius])

  return (
    <group position={pos}>
      <Text
        fontSize={d.size || 0.15}
        color={d.color || '#ffffff'}
        anchorX="center"
        anchorY="middle"
        fillOpacity={0.85}
        outlineWidth={0}
      >
        {d.text}
      </Text>
    </group>
  )
}

export default function Labels({ data, visible = true }: LabelsProps) {
  const GLOBE_RADIUS = 2.12

  if (!visible || data.length === 0) return null

  return (
    <group>
      {data.map((d, i) => (
        <Label key={i} data={d} radius={GLOBE_RADIUS} />
      ))}
    </group>
  )
}

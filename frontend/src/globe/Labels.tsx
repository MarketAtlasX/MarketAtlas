import { useMemo } from 'react'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { latLngToDir } from '../features/globe/SceneDirector'

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

function Label({ data: d, radius }: { data: LabelData; radius: number }) {
  const pos = useMemo(() => latLngToDir(d.lat, d.lng).multiplyScalar(radius), [d.lat, d.lng, radius])

  return (
    <group position={pos}>
      <Text
        fontSize={d.size || 0.15}
        color={d.color || '#ffffff'}
        anchorX="center"
        anchorY="middle"
        fillOpacity={0.85}
        outlineWidth={0.006}
        outlineColor="#051322"
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

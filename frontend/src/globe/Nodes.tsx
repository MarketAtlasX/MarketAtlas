import { useMemo } from 'react'
import * as THREE from 'three'

interface NodeData {
  lat: number
  lng: number
  radius?: number
  color?: string
  pulseColor?: string
  pulseSpeed?: number
  label?: string
}

interface NodesProps {
  data: NodeData[]
  visible?: boolean
  onNodeClick?: (data: NodeData) => void
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

function NodePulse({ data: d, radius, onNodeClick }: { data: NodeData; radius: number; onNodeClick?: (d: NodeData) => void }) {
  const pos = useMemo(() => latLngToVec3(d.lat, d.lng, radius), [d.lat, d.lng, radius])
  const color = useMemo(() => new THREE.Color(d.color || '#00d4ff'), [d.color])
  const nodeSize = Math.min(d.radius || 0.055, 0.075)

  return (
    <group position={pos}>
      <mesh
        onClick={e => { e.stopPropagation(); onNodeClick?.(d) }}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}
      >
        <sphereGeometry args={[nodeSize, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  )
}

export default function Nodes({ data, visible = true, onNodeClick }: NodesProps) {
  const GLOBE_RADIUS = 2.03

  if (!visible || data.length === 0) return null

  return (
    <group>
      {data.map((d, i) => (
        <NodePulse key={i} data={d} radius={GLOBE_RADIUS} onNodeClick={onNodeClick} />
      ))}
    </group>
  )
}


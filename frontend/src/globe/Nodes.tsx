import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { latLngToDir } from '../features/globe/SceneDirector'

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

function NodePulse({ data: d, radius, onNodeClick }: { data: NodeData; radius: number; onNodeClick?: (d: NodeData) => void }) {
  const coreRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  const pos = useMemo(() => latLngToDir(d.lat, d.lng).multiplyScalar(radius), [d.lat, d.lng, radius])
  const color = useMemo(() => new THREE.Color(d.color || '#00d4ff'), [d.color])
  const pulseCol = useMemo(() => new THREE.Color(d.pulseColor || d.color || '#00d4ff'), [d.pulseColor, d.color])
  const nodeSize = d.radius || 0.08
  const speed = d.pulseSpeed || 2.0

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed

    if (coreRef.current) {
      const breathe = 1 + Math.sin(t * 1.5) * 0.15
      coreRef.current.scale.setScalar(breathe)
    }

    if (ringRef.current) {
      const scale = 1 + Math.sin(t) * 3
      ringRef.current.scale.setScalar(scale)
      const mat = ringRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = Math.max(0, 0.5 - (scale - 1) * 0.12)
    }

    if (glowRef.current) {
      const pulse = 1 + Math.sin(t * 0.7) * 0.4
      glowRef.current.scale.setScalar(pulse)
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.15 + Math.sin(t * 1.2) * 0.05
    }
  })

  return (
    <group position={pos}>
      <mesh ref={glowRef}>
        <sphereGeometry args={[nodeSize * 5, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.15}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={ringRef}>
        <sphereGeometry args={[nodeSize * 2, 16, 16]} />
        <meshBasicMaterial
          color={pulseCol}
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh
        ref={coreRef}
        onClick={e => { e.stopPropagation(); onNodeClick?.(d) }}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}
      >
        <sphereGeometry args={[nodeSize, 16, 16]} />
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


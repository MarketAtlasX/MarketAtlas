import { useMemo } from 'react'
import * as THREE from 'three'

interface HeatmapPoint {
  lat: number
  lng: number
  intensity: number
  color?: string
}

interface HeatmapProps {
  data: HeatmapPoint[]
  visible?: boolean
  radius?: number
}

function latLngToVec3(lat: number, lng: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  )
}

export default function Heatmap({ data, visible = true, radius = 2.04 }: HeatmapProps) {
  const points = useMemo(() => {
    if (!visible || data.length === 0) return null

    const positions = new Float32Array(data.length * 3)
    const colors = new Float32Array(data.length * 3)
    const sizes = new Float32Array(data.length)

    for (let i = 0; i < data.length; i++) {
      const d = data[i]
      const pos = latLngToVec3(d.lat, d.lng, radius)
      positions[i * 3] = pos.x
      positions[i * 3 + 1] = pos.y
      positions[i * 3 + 2] = pos.z

      const c = d.color ? new THREE.Color(d.color) : new THREE.Color().setHSL(0.6 - d.intensity * 0.5, 1, 0.5)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b

      sizes[i] = 0.05 + d.intensity * 0.3
    }

    return { positions, colors, sizes }
  }, [data, visible, radius])

  if (!points) return null

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute args={[points.positions, 3]} attach="attributes-position" count={data.length} />
        <bufferAttribute args={[points.colors, 3]} attach="attributes-color" count={data.length} />
        <bufferAttribute args={[points.sizes, 1]} attach="attributes-size" count={data.length} />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        vertexColors
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

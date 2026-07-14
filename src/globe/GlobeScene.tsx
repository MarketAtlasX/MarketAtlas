import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const COUNT = 4500
const SIZE = 800

export default function Stars() {
  const ref = useRef<THREE.Points>(null)

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    const cols = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      const radius = 100 + Math.random() * SIZE
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = radius * Math.cos(phi)
      const b = 0.5 + Math.random() * 0.5
      cols[i * 3] = b * (0.8 + Math.random() * 0.2)
      cols[i * 3 + 1] = b * (0.8 + Math.random() * 0.2)
      cols[i * 3 + 2] = b
    }
    return [pos, cols]
  }, [])

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.005
    }
  })

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute args={[positions, 3]} attach="attributes-position" count={COUNT} />
        <bufferAttribute args={[colors, 3]} attach="attributes-color" count={COUNT} />
      </bufferGeometry>
      <pointsMaterial
        size={2}
        vertexColors
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}




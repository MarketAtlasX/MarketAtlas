import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

export default function Earth() {
  const meshRef = useRef<THREE.Mesh>(null)

  const earthMap = useTexture('/globe/earth-day.jpg')
  useTexture('/globe/earth-topology.png')

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.05
    }
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 64, 64]} />
      <meshBasicMaterial
        map={earthMap}
        color="#c3d2cf"
      />
    </mesh>
  )
}

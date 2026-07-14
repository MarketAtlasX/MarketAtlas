import { useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
import * as THREE from 'three'

export default function Earth() {
  const meshRef = useRef<THREE.Mesh>(null)

  const [dayTexture, bumpTexture] = useLoader(TextureLoader, [
    'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg',
    'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png',
  ])

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.05
    }
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 64, 64]} />
      <meshPhongMaterial
        map={dayTexture}
        bumpMap={bumpTexture}
        bumpScale={0.04}
        emissive={new THREE.Color('#224488')}
        emissiveIntensity={0.4}
        specular={new THREE.Color('#334466')}
        shininess={15}
      />
    </mesh>
  )
}



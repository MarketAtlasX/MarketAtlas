import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { TextureLoader } from 'three'
import * as THREE from 'three'

export default function Earth() {
  const meshRef = useRef<THREE.Mesh>(null)
  const [textures, setTextures] = useState<{ map: THREE.Texture | null; bump: THREE.Texture | null }>({
    map: null,
    bump: null,
  })

  useEffect(() => {
    const loader = new TextureLoader()
    let alive = true
    Promise.all([
      loader.loadAsync('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg'),
      loader.loadAsync('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png'),
    ])
      .then(([map, bump]) => {
        if (alive) setTextures({ map, bump })
      })
      .catch(() => {
        if (alive) setTextures({ map: null, bump: null })
      })
    return () => {
      alive = false
    }
  }, [])

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.05
    }
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 64, 64]} />
      <meshPhongMaterial
        map={textures.map ?? undefined}
        bumpMap={textures.bump ?? undefined}
        bumpScale={0.04}
        color={textures.map ? '#ffffff' : '#0a1a2e'}
        emissive={new THREE.Color('#1b3a5c')}
        emissiveIntensity={0.5}
        specular={new THREE.Color('#334466')}
        shininess={15}
      />
    </mesh>
  )
}

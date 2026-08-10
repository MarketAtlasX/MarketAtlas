import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { HolographicShaderMaterial } from '../shaders/holographic'

interface HologramProps {
  radius?: number
}

export default function Hologram({ radius = 2.01 }: HologramProps) {
  const ref = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const material = useMemo(() => {
    const mat = new HolographicShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
    })
    mat.uniforms.time.value = 0
    return mat
  }, [])

  useFrame(({ clock }) => {
    if (material) {
      material.uniforms.time.value = clock.getElapsedTime()
    }
    if (ref.current) {
      ref.current.rotation.y += 0.005
    }
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[radius, 64, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}


import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface RingData {
  radius: number
  color: string
  opacity: number
  speed: number
  tilt?: number
}

const ringData: RingData[] = [
  { radius: 2.8, color: '#44ffdd', opacity: 0.7, speed: 0.02, tilt: 0.1 },
  { radius: 3.2, color: '#8888ff', opacity: 0.45, speed: -0.018, tilt: 0.2 },
  { radius: 3.7, color: '#00ffcc', opacity: 0.4, speed: 0.025, tilt: 0.15 },
]

function Ring({ data }: { data: RingData }) {
  const ref = useRef<THREE.Mesh>(null)

  const uniforms = useMemo(
    () => ({
      color: { value: new THREE.Color(data.color) },
      opacity: { value: data.opacity },
    }),
    [data.color, data.opacity],
  )

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.z += delta * data.speed
    }
  })

  return (
    <mesh ref={ref} rotation={[data.tilt || 0, 0, 0]}>
      <ringGeometry args={[data.radius - 0.03, data.radius, 128]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          precision highp float;
          uniform vec3 color;
          uniform float opacity;
          varying vec2 vUv;

          void main() {
            float alpha = opacity * (1.0 - abs(vUv.x - 0.5) * 2.0);
            gl_FragColor = vec4(color, alpha);
          }
        `}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

export default function Rings() {
  return (
    <group>
      {ringData.map((data, i) => (
        <Ring key={i} data={data} />
      ))}
    </group>
  )
}




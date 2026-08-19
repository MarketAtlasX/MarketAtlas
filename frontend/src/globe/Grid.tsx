import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const vertexShader = `
  varying vec3 vPosition;
  void main() {
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  precision highp float;

  uniform float opacity;
  uniform vec3 color;

  varying vec3 vPosition;

  void main() {
    float lat = atan(vPosition.z, vPosition.x);
    float lng = asin(vPosition.y / 2.0);

    float latLine = sin(lat * 10.0);
    float lngLine = sin(lng * 20.0);

    float grid = smoothstep(0.98, 0.995, abs(latLine)) + smoothstep(0.98, 0.995, abs(lngLine));
    grid = clamp(grid, 0.0, 1.0);

    float alpha = grid * opacity;
    gl_FragColor = vec4(color, alpha);
  }
`

export default function Grid() {
  const ref = useRef<THREE.Mesh>(null)
  const uniforms = useMemo(
    () => ({
      opacity: { value: 0.1 },
      color: { value: new THREE.Color('#00bbff') },
    }),
    [],
  )

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.012
    }
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[2.08, 64, 64]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}



import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { RegionFocus } from '../features/globe/SceneDirector'

const RADIUS = 2.07

function latLngToDir(lat: number, lng: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta),
  )
}

export interface FocusRingsProps {
  regions: RegionFocus[]
  visible?: boolean
}

export default function FocusRings({ regions, visible = true }: FocusRingsProps) {
  const data = useMemo(
    () =>
      regions.map(r => {
        const dir = latLngToDir(r.lat, r.lng).multiplyScalar(RADIUS)
        return {
          position: dir.clone(),
          quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize()),
          color: new THREE.Color(r.color),
          intensity: r.intensity,
          seed: Math.random() * Math.PI * 2,
        }
      }),
    [regions],
  )

  const refs = useMemo(
    () =>
      data.map(() => ({
        ring: { current: null as THREE.Mesh | null },
        material: { current: null as THREE.MeshBasicMaterial | null },
        glow: { current: null as THREE.Mesh | null },
        glowMaterial: { current: null as THREE.MeshBasicMaterial | null },
      })),
    [data],
  )

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    data.forEach((d, i) => {
      const ring = refs[i].ring.current
      const mat = refs[i].material.current
      const glow = refs[i].glow.current
      const glowMat = refs[i].glowMaterial.current
      if (!ring || !mat) return
      const pulse = 1 + Math.sin(t * 2.4 + d.seed) * 0.5 * d.intensity
      ring.scale.setScalar(pulse)
      mat.opacity = Math.max(0, 0.75 * d.intensity - (pulse - 1) * 0.5)
      if (glow && glowMat) {
        const glowPulse = 1 + Math.sin(t * 1.6 + d.seed) * 0.35
        glow.scale.setScalar(glowPulse)
        glowMat.opacity = (0.12 + Math.sin(t * 2 + d.seed) * 0.05) * d.intensity
      }
    })
  })

  if (!visible || data.length === 0) return null

  return (
    <group>
      {data.map((d, i) => (
        <group key={i} position={d.position} quaternion={d.quaternion}>
          <mesh ref={refs[i].ring}>
            <ringGeometry args={[0.16, 0.24, 48]} />
            <meshBasicMaterial
              ref={refs[i].material}
              color={d.color}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh ref={refs[i].glow}>
            <sphereGeometry args={[0.11, 16, 16]} />
            <meshBasicMaterial
              ref={refs[i].glowMaterial}
              color={d.color}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}
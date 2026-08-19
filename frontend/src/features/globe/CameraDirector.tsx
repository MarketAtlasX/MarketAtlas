import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import type { SceneConfig } from './SceneDirector'

export interface CameraDirectorProps {
  scene: SceneConfig
  runId: number
}

export default function CameraDirector({ scene, runId }: CameraDirectorProps) {
  const camera = useThree(s => s.camera)
  const controls = useThree(s => s.controls) as unknown as {
    enabled: boolean
    autoRotate: boolean
    target: { set: (x: number, y: number, z: number) => void }
  } | null

  const tweenRef = useRef<gsap.core.Tween | null>(null)
  const orbitAngle = useRef(0)

  useEffect(() => {
    tweenRef.current?.kill()
    const target = scene.camera.position
    const look = scene.camera.lookAt
    const isOrbit = scene.camera.kind === 'orbit'

    if (controls) {
      controls.enabled = !isOrbit
      controls.autoRotate = scene.autoRotate && !isOrbit
    }

    const duration = runId === 0 ? 0 : 1.6
    tweenRef.current = gsap.to(camera.position, {
      x: target[0],
      y: target[1],
      z: target[2],
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        camera.lookAt(look[0], look[1], look[2])
        if (controls) controls.target.set(look[0], look[1], look[2])
      },
      onComplete: () => {
        if (controls && !isOrbit) controls.enabled = true
      },
    })

    return () => {
      tweenRef.current?.kill()
    }
  }, [camera, controls, scene, runId])

  useFrame(({ clock }) => {
    if (scene.camera.kind !== 'orbit') return

    const t = clock.getElapsedTime()
    orbitAngle.current += 0.0016
    const r = 6.2
    const y = 0.6 + Math.sin(t * 0.06) * 0.5
    camera.position.set(
      Math.cos(orbitAngle.current) * r,
      y,
      Math.sin(orbitAngle.current) * r,
    )
    camera.lookAt(0, 0, 0)
  })

  return null
}
import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import gsap from 'gsap'
import type { SceneConfig } from './SceneDirector'

export interface CameraDirectorProps {
  scene: SceneConfig
  runId: number
}

export default function CameraDirector({ scene, runId }: CameraDirectorProps) {
  const { camera } = useThree()
  const tweenRef = useRef<gsap.core.Tween | null>(null)

  useEffect(() => {
    tweenRef.current?.kill()
    const target = scene.camera.position
    const duration = runId === 0 ? 0 : 1.6
    tweenRef.current = gsap.to(camera.position, {
      x: target[0],
      y: target[1],
      z: target[2],
      duration,
      ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(scene.camera.lookAt[0], scene.camera.lookAt[1], scene.camera.lookAt[2]),
    })
    return () => {
      tweenRef.current?.kill()
    }
  }, [camera, scene, runId])

  return null
}
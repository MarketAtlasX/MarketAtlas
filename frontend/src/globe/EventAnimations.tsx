import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'

interface CameraTarget {
  lat: number
  lng: number
  altitude?: number
}

interface EventAnimationsProps {
  target?: CameraTarget | null
  children?: React.ReactNode
}

export default function EventAnimations({ target }: EventAnimationsProps) {
  const { camera } = useThree()
  const isAnimating = useRef(false)

  useEffect(() => {
    if (!target || isAnimating.current) return

    isAnimating.current = true

    const phi = (90 - target.lat) * (Math.PI / 180)
    const theta = (target.lng + 180) * (Math.PI / 180)
    const altitude = target.altitude || 1.5
    const targetRadius = 4 * altitude

    const targetPos = new THREE.Vector3(
      -targetRadius * Math.sin(phi) * Math.cos(theta),
      targetRadius * Math.cos(phi),
      targetRadius * Math.sin(phi) * Math.sin(theta),
    )

    const startPos = camera.position.clone()
    const duration = 1.5

    gsap.to(camera.position, {
      x: targetPos.x,
      y: targetPos.y,
      z: targetPos.z,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        camera.lookAt(0, 0, 0)
      },
      onComplete: () => {
        isAnimating.current = false
      },
    })

    return () => {
      isAnimating.current = false
    }
  }, [target, camera])

  return null
}

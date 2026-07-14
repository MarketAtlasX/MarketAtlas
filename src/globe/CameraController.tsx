import { useRef, useCallback, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'

export interface CameraTarget {
  lat: number
  lng: number
  altitude?: number
}

export interface CameraControllerHandle {
  flyTo: (target: CameraTarget) => void
  focusCountry: (lat: number, lng: number) => void
  focusEvent: (lat: number, lng: number) => void
  zoom: (level: number) => void
  orbit: (speed: number) => void
  resetView: () => void
}

export function useCameraController(onReady?: (handle: CameraControllerHandle) => void) {
  const { camera } = useThree()
  const isAnimating = useRef(false)
  const autoRotate = useRef(true)
  const angle = useRef(0)
  const handleRef = useRef<CameraControllerHandle | null>(null)

  const flyTo = useCallback((target: CameraTarget) => {
    isAnimating.current = true
    autoRotate.current = false

    const phi = (90 - target.lat) * (Math.PI / 180)
    const theta = (target.lng + 180) * (Math.PI / 180)
    const altitude = target.altitude || 1.5
    const targetRadius = 4 * altitude

    const targetPos = new THREE.Vector3(
      -targetRadius * Math.sin(phi) * Math.cos(theta),
      targetRadius * Math.cos(phi),
      targetRadius * Math.sin(phi) * Math.sin(theta),
    )

    gsap.to(camera.position, {
      x: targetPos.x,
      y: targetPos.y,
      z: targetPos.z,
      duration: 1.5,
      ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(0, 0, 0),
      onComplete: () => { isAnimating.current = false },
    })
  }, [camera])

  const focusCountry = useCallback((lat: number, lng: number) => {
    flyTo({ lat, lng, altitude: 1.2 })
  }, [flyTo])

  const focusEvent = useCallback((lat: number, lng: number) => {
    flyTo({ lat, lng, altitude: 0.8 })
  }, [flyTo])

  const zoom = useCallback((level: number) => {
    const clamped = Math.max(0.5, Math.min(5, level))
    const direction = camera.position.clone().normalize()
    const newPos = direction.multiplyScalar(4 * clamped)
    gsap.to(camera.position, {
      x: newPos.x,
      y: newPos.y,
      z: newPos.z,
      duration: 1,
      ease: 'power2.out',
      onUpdate: () => camera.lookAt(0, 0, 0),
    })
  }, [camera])

  const orbit = useCallback(() => {
    autoRotate.current = true
  }, [])

  const resetView = useCallback(() => {
    autoRotate.current = true
    angle.current = 0
    gsap.to(camera.position, {
      x: 0,
      y: 1.5,
      z: 5,
      duration: 1.5,
      ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(0, 0, 0),
      onComplete: () => { isAnimating.current = false },
    })
  }, [camera])

  const handle: CameraControllerHandle = {
    flyTo, focusCountry, focusEvent, zoom, orbit, resetView,
  }

  handleRef.current = handle

  useEffect(() => {
    if (onReady && handleRef.current) {
      onReady(handleRef.current)
    }
  }, [onReady])

  useFrame((_, delta) => {
    if (autoRotate.current && !isAnimating.current) {
      angle.current += delta * 0.15
      const radius = camera.position.length()
      camera.position.x = radius * Math.sin(angle.current)
      camera.position.z = radius * Math.cos(angle.current)
      camera.lookAt(0, 0, 0)
    }
  })

  return handle
}

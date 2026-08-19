import * as THREE from 'three'

export function latLngToDir(lat: number, lng: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta),
  )
}

export function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  return latLngToDir(lat, lng).multiplyScalar(radius)
}

export function arcPoints(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  radius: number,
  segments = 90,
): THREE.Vector3[] {
  const start = latLngToVec3(startLat, startLng, radius)
  const end = latLngToVec3(endLat, endLng, radius)
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  const dist = start.distanceTo(end)
  mid.normalize().multiplyScalar(radius + dist * 0.3)

  const points: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const a = new THREE.Vector3().lerpVectors(start, mid, t)
    const b = new THREE.Vector3().lerpVectors(mid, end, t)
    points.push(new THREE.Vector3().lerpVectors(a, b, t))
  }
  return points
}

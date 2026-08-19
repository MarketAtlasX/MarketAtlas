import * as THREE from 'three'
import type { VisualizationIntent } from './visualizationIntent'
import { resolveCoords } from './globeData'
import { worldStates } from '../../data/worldState'

export interface CoreTransition {
  detach: number
  focus: THREE.Vector3 | null
  focusStrength: number
  focusRadius: number
  heatColor: string
  tint: string
}

export interface RouteFlow {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  color: string
}

export interface RegionFocus {
  lat: number
  lng: number
  color: string
  intensity: number
  label?: string
}

export interface SceneConfig {
  transition: CoreTransition
  camera: { position: [number, number, number]; lookAt: [number, number, number] }
  routes: RouteFlow[]
  regions: RegionFocus[]
  showOverlays: boolean
  autoRotate: boolean
}

export function latLngToDir(lat: number, lng: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta),
  )
}

const MAJOR_HUBS = ['United States', 'Germany', 'China', 'Japan', 'India', 'Brazil', 'Saudi Arabia']

function paletteFor(key: string): { heat: string; tint: string } {
  switch (key) {
    case 'risk':
      return { heat: '#ff3b30', tint: '#ff9a5a' }
    case 'core':
      return { heat: '#7adcff', tint: '#c9b458' }
    case 'gold':
      return { heat: '#ffd54a', tint: '#e8b84b' }
    default:
      return { heat: '#ffb020', tint: '#e8b84b' }
  }
}

function focusDirFor(entity: string | null | undefined): THREE.Vector3 | null {
  if (!entity) return null
  const c = resolveCoords(entity)
  if (!c) return null
  return latLngToDir(c.lat, c.lng)
}

function regionFocusFor(entity: string): RegionFocus | null {
  const c = resolveCoords(entity)
  if (!c) return null
  const ws = worldStates.find(w => w.name === entity)
  const risk = ws?.riskScore ?? 50
  const color = risk >= 70 ? '#ff3b30' : risk >= 55 ? '#ff7a2e' : '#e8b84b'
  return { lat: c.lat, lng: c.lng, color, intensity: Math.min(1, risk / 80), label: entity }
}

export function resolveScene(intent: VisualizationIntent): SceneConfig {
  const palette = paletteFor(intent.palette || 'ultron')
  const focusEntity = intent.focus?.[0] ?? intent.origin
  const focusDir = focusDirFor(focusEntity)

  const originDir = focusDirFor(intent.origin)
  const destDir = focusDirFor(intent.destination)

  const routes: RouteFlow[] = []
  const regions: RegionFocus[] = []
  let detach = 0
  let focusStrength = 0
  let focusRadius = 0.8
  let heatColor = palette.heat
  let tint = palette.tint
  let showOverlays = false
  let autoRotate = true
  let cameraPos: [number, number, number] = [0, 1.5, 6.5]
  let lookAt: [number, number, number] = [0, 0, 0]

  switch (intent.mode) {
    case 'abstract':
    case 'core': {
      detach = intent.mode === 'abstract' ? 1 : 0
      tint = '#7fa8ff'
      heatColor = '#7adcff'
      cameraPos = intent.mode === 'abstract' ? [0, 0.6, 6] : [0, 1.2, 5.2]
      autoRotate = intent.mode === 'abstract'
      break
    }
    case 'country': {
      detach = 0.12
      if (focusDir) {
        focusStrength = 0.95
        focusRadius = 0.55
        cameraPos = [
          focusDir.x * 3.1,
          focusDir.y * 3.1 + 0.45,
          focusDir.z * 3.1,
        ]
      }
      showOverlays = true
      break
    }
    case 'region': {
      detach = 0.06
      if (focusDir) {
        focusStrength = 0.6
        focusRadius = 0.85
        cameraPos = [focusDir.x * 4.1, focusDir.y * 4.1 + 0.3, focusDir.z * 4.1]
      }
      showOverlays = true
      break
    }
    case 'route': {
      detach = 0.02
      if (originDir && destDir) {
        const mid = originDir.clone().add(destDir).normalize()
        focusDir?.copy(mid)
        focusStrength = 0.35
        focusRadius = 1.1
      } else if (originDir) {
        focusStrength = 0.25
        focusRadius = 1.2
      }
      const from = resolveCoords(intent.origin ?? focusEntity ?? '')
      if (from) {
        if (intent.destination && resolveCoords(intent.destination)) {
          const to = resolveCoords(intent.destination) as { lat: number; lng: number }
          routes.push({ startLat: from.lat, startLng: from.lng, endLat: to.lat, endLng: to.lng, color: '#ffd54a' })
        } else {
          for (const hub of MAJOR_HUBS) {
            const h = resolveCoords(hub)
            if (h && hub.toLowerCase() !== (intent.origin ?? '').toLowerCase()) {
              routes.push({ startLat: from.lat, startLng: from.lng, endLat: h.lat, endLng: h.lng, color: '#38a8ff' })
            }
          }
        }
      }
      cameraPos = [0, 1.5, 7]
      showOverlays = true
      break
    }
    case 'network': {
      detach = 0.15
      showOverlays = true
      cameraPos = [0, 1.5, 6.5]
      break
    }
    case 'risk': {
      detach = 0.1
      heatColor = '#ff3b30'
      tint = '#ff9a5a'
      for (const ws of worldStates) {
        if (ws.riskScore >= 55) {
          const r = regionFocusFor(ws.name)
          if (r) regions.push(r)
        }
      }
      if (focusDir) {
        focusStrength = 0.5
        focusRadius = 1.0
        cameraPos = [focusDir.x * 4.3, focusDir.y * 4.3 + 0.3, focusDir.z * 4.3]
      } else {
        cameraPos = [0, 1.2, 6.2]
      }
      showOverlays = true
      break
    }
    case 'conflict': {
      detach = 0.12
      heatColor = '#ff3b30'
      tint = '#ff6a4a'
      const targets = intent.focus?.length ? intent.focus : []
      for (const e of targets) {
        const r = regionFocusFor(e)
        if (r) regions.push(r)
      }
      if (focusDir) {
        focusStrength = 0.8
        focusRadius = 0.7
        cameraPos = [focusDir.x * 4.0, focusDir.y * 4.0 + 0.4, focusDir.z * 4.0]
      } else {
        cameraPos = [0, 1.2, 6.5]
      }
      showOverlays = true
      break
    }
    case 'globe':
    default: {
      detach = 0
      cameraPos = [0, 1.5, 6.5]
      showOverlays = true
      break
    }
  }

  return {
    transition: { detach, focus: focusDir, focusStrength, focusRadius, heatColor, tint },
    camera: { position: cameraPos, lookAt },
    routes,
    regions,
    showOverlays,
    autoRotate,
  }
}
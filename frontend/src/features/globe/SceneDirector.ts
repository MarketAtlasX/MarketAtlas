import * as THREE from 'three'
import type { VisualizationIntent } from './visualizationIntent'
import { resolveCoords } from './globeData'
import { worldStates } from '../../data/worldState'
import { tradeRoutes, militaryRelations, type TradeRoute, type MilitaryRelation } from '../../data/relations'
import { supplyChainPaths } from '../../data/supplyChains'

export interface CoreTransition {
  detach: number
  focus: THREE.Vector3 | null
  focusStrength: number
  focusRadius: number
  heatColor: string
  tint: string
}

export type FlowTone = 'gold' | 'cyan' | 'red' | 'amber'

export interface RouteFlow {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  color: string
  intensity?: number
  tone?: FlowTone
}

export type FocusKind = 'focus' | 'conflict' | 'hub'

export interface RegionFocus {
  lat: number
  lng: number
  color: string
  intensity: number
  label?: string
  kind?: FocusKind
}

export type CameraKind = 'globe' | 'map' | 'orbit'

export interface SceneConfig {
  transition: CoreTransition
  camera: { position: [number, number, number]; lookAt: [number, number, number]; kind: CameraKind }
  routes: RouteFlow[]
  regions: RegionFocus[]
  conflicts: RegionFocus[]
  map: boolean
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

const CODE_TO_NAME: Record<string, string> = {}
for (const ws of worldStates) CODE_TO_NAME[ws.code] = ws.name

function hubName(code: string): string {
  return CODE_TO_NAME[code] ?? code
}

function paletteFor(key: string): { heat: string; tint: string } {
  switch (key) {
    case 'risk':
      return { heat: '#ff3b30', tint: '#ff9a5a' }
    case 'core':
      return { heat: '#7adcff', tint: '#c9b458' }
    case 'gold':
      return { heat: '#ffd54a', tint: '#e8b84b' }
    case 'map':
      return { heat: '#38e8ff', tint: '#f2c14e' }
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

function regionFocusFor(entity: string, kind: FocusKind = 'focus'): RegionFocus | null {
  const c = resolveCoords(entity)
  if (!c) return null
  const ws = worldStates.find(w => w.name === entity)
  const risk = ws?.riskScore ?? 50
  const color = kind === 'conflict'
    ? (risk >= 70 ? '#ff3b30' : risk >= 55 ? '#ff7a2e' : '#ff4d5e')
    : kind === 'hub'
      ? '#f2c14e'
      : (risk >= 70 ? '#ff4d5e' : risk >= 55 ? '#f5b941' : '#f2c14e')
  return { lat: c.lat, lng: c.lng, color, intensity: Math.min(1, (risk + 25) / 100), label: entity, kind }
}

function parseValue(v: string): number {
  const m = /([\d.]+)([BMT])?/.exec(v)
  if (!m) return 1
  const n = parseFloat(m[1])
  const unit = m[2]
  const mult = unit === 'T' ? 1000 : unit === 'M' ? 0.001 : 1
  return n * mult
}

function tradeToFlow(r: TradeRoute, intensity: number): RouteFlow {
  const heat = intensity > 0.35 ? 1 : intensity > 0.16 ? 0.6 : 0.35
  return {
    startLat: r.fromLat,
    startLng: r.fromLng,
    endLat: r.toLat,
    endLng: r.toLng,
    color: heat >= 1 ? '#ffd54a' : heat >= 0.6 ? '#f2c14e' : '#7adcff',
    intensity: heat,
    tone: heat >= 0.6 ? 'gold' : 'cyan',
  }
}

export function buildTradeFlows(): RouteFlow[] {
  const maxVal = Math.max(...tradeRoutes.map(r => parseValue(r.value)))
  return tradeRoutes.map(r => tradeToFlow(r, parseValue(r.value) / maxVal))
}

export function buildSupplyFlows(): RouteFlow[] {
  const flows: RouteFlow[] = []
  for (const path of supplyChainPaths) {
    for (const link of path.links) {
      const a = resolveCoords(hubName(link.fromCountry))
      const b = resolveCoords(hubName(link.toCountry))
      if (!a || !b) continue
      flows.push({
        startLat: a.lat,
        startLng: a.lng,
        endLat: b.lat,
        endLng: b.lng,
        color: '#38e8ff',
        intensity: link.criticality / 10,
        tone: 'cyan',
      })
    }
  }
  return flows
}

export function buildConflictFlows(): RouteFlow[] {
  const flows: RouteFlow[] = []
  for (const rel of militaryRelations) {
    if (rel.type !== 'conflict' && rel.type !== 'rivalry') continue
    const a = resolveCoords(hubName(rel.countryA))
    const b = resolveCoords(hubName(rel.countryB))
    if (!a || !b) continue
    flows.push({
      startLat: a.lat,
      startLng: a.lng,
      endLat: b.lat,
      endLng: b.lng,
      color: rel.type === 'conflict' ? '#ff3b30' : '#ff7a2e',
      intensity: rel.type === 'conflict' ? 1 : 0.65,
      tone: 'red',
    })
  }
  return flows
}

function hubNetworkFlows(): RouteFlow[] {
  const flows: RouteFlow[] = []
  for (let i = 0; i < MAJOR_HUBS.length; i++) {
    for (let j = i + 1; j < MAJOR_HUBS.length; j++) {
      const a = resolveCoords(MAJOR_HUBS[i])
      const b = resolveCoords(MAJOR_HUBS[j])
      if (!a || !b) continue
      flows.push({
        startLat: a.lat,
        startLng: a.lng,
        endLat: b.lat,
        endLng: b.lng,
        color: '#38e8ff',
        intensity: 0.35,
        tone: 'cyan',
      })
    }
  }
  return flows
}

function originFanFlows(origin: string): RouteFlow[] {
  const flows: RouteFlow[] = []
  const from = resolveCoords(origin)
  if (!from) return flows
  for (const hub of MAJOR_HUBS) {
    const h = resolveCoords(hub)
    if (!h || hub.toLowerCase() === origin.toLowerCase()) continue
    const risk = worldStates.find(w => w.name === hub)?.riskScore ?? 50
    flows.push({
      startLat: from.lat,
      startLng: from.lng,
      endLat: h.lat,
      endLng: h.lng,
      color: risk >= 65 ? '#ff7a2e' : '#38a8ff',
      intensity: risk >= 65 ? 0.7 : 0.45,
      tone: risk >= 65 ? 'red' : 'cyan',
    })
  }
  return flows
}

export function resolveScene(intent: VisualizationIntent): SceneConfig {
  const palette = paletteFor(intent.palette || 'ultron')
  const focusEntity = intent.focus?.[0] ?? intent.origin
  const focusDir = focusDirFor(focusEntity)

  const originDir = focusDirFor(intent.origin)
  const destDir = focusDirFor(intent.destination)

  const routes: RouteFlow[] = []
  const regions: RegionFocus[] = []
  const conflicts: RegionFocus[] = []
  let detach = 0
  let focusStrength = 0
  let focusRadius = 0.8
  let heatColor = palette.heat
  let tint = palette.tint
  let showOverlays = false
  let autoRotate = true
  let map = false
  let cameraKind: CameraKind = 'globe'
  let cameraPos: [number, number, number] = [0, 1.5, 6.5]
  let lookAt: [number, number, number] = [0, 0, 0]

  switch (intent.mode) {
    case 'abstract':
    case 'core': {
      detach = intent.mode === 'abstract' ? 1 : 0
      tint = '#7fa8ff'
      heatColor = '#7adcff'
      cameraPos = intent.mode === 'abstract' ? [0, 0.6, 6] : [0, 1.2, 5.2]
      cameraKind = intent.mode === 'abstract' ? 'orbit' : 'globe'
      autoRotate = intent.mode === 'abstract'
      break
    }
    case 'country': {
      detach = 0.16
      if (focusDir) {
        focusStrength = 0.95
        focusRadius = 0.5
        cameraPos = [focusDir.x * 3.05, focusDir.y * 3.05 + 0.45, focusDir.z * 3.05]
      }
      const r = regionFocusFor(focusEntity ?? '')
      if (r) regions.push(r)
      showOverlays = true
      break
    }
    case 'region': {
      detach = 0.08
      if (focusDir) {
        focusStrength = 0.6
        focusRadius = 0.85
        cameraPos = [focusDir.x * 4.1, focusDir.y * 4.1 + 0.3, focusDir.z * 4.1]
      }
      for (const e of intent.focus ?? []) {
        const r = regionFocusFor(e)
        if (r) regions.push(r)
      }
      showOverlays = true
      break
    }
    case 'route': {
      detach = 0.3
      const originCoords = resolveCoords(intent.origin ?? '')
      const destCoords = resolveCoords(intent.destination ?? '')
      if (originDir && destDir && originCoords && destCoords) {
        const mid = originDir.clone().add(destDir).normalize()
        focusDir?.copy(mid)
        focusStrength = 0.35
        focusRadius = 1.1
        routes.push({
          startLat: originCoords.lat,
          startLng: originCoords.lng,
          endLat: destCoords.lat,
          endLng: destCoords.lng,
          color: '#ffd54a',
          intensity: 1,
          tone: 'gold',
        })
      } else if (originDir && originCoords) {
        focusStrength = 0.3
        focusRadius = 1.2
      }
      routes.push(...originFanFlows(intent.origin ?? ''))
      if (routes.length === 0) routes.push(...hubNetworkFlows())
      if (intent.destination && !routes.some(r => r.intensity === 1)) {
        const dest = resolveCoords(intent.destination)
        if (dest) {
          routes.push({
            startLat: dest.lat,
            startLng: dest.lng,
            endLat: dest.lat + 0.01,
            endLng: dest.lng + 0.01,
            color: '#ffd54a',
            intensity: 0,
            tone: 'gold',
          })
        }
      }
      for (const e of [intent.origin, intent.destination, ...(intent.focus ?? [])]) {
        if (!e) continue
        const r = regionFocusFor(e)
        if (r) regions.push(r)
      }
      cameraPos = [0, 1.7, 7.6]
      showOverlays = true
      break
    }
    case 'network': {
      detach = 0.22
      routes.push(...hubNetworkFlows())
      for (const hub of MAJOR_HUBS) {
        const r = regionFocusFor(hub, 'hub')
        if (r) regions.push(r)
      }
      cameraPos = [0, 1.6, 7]
      showOverlays = true
      break
    }
    case 'map':
    case 'supply': {
      detach = 0.5
      map = true
      cameraKind = 'map'
      if (intent.mode === 'supply') {
        routes.push(...buildSupplyFlows())
        routes.push(...buildTradeFlows().filter(f => f.intensity !== undefined && f.intensity >= 0.6))
      } else {
        routes.push(...buildTradeFlows())
      }
      for (const hub of MAJOR_HUBS) {
        const r = regionFocusFor(hub, 'hub')
        if (r) regions.push(r)
      }
      for (const e of intent.focus ?? []) {
        const r = regionFocusFor(e, 'focus')
        if (r) regions.push(r)
      }
      cameraPos = intent.mode === 'supply' ? [0, 3.2, 7.2] : [0, 3.6, 7.6]
      lookAt = intent.mode === 'supply' ? [0, -0.2, 0] : [0, -0.3, 0]
      showOverlays = true
      break
    }
    case 'risk': {
      detach = 0.12
      heatColor = '#ff3b30'
      tint = '#ff9a5a'
      for (const ws of worldStates) {
        if (ws.riskScore >= 55) {
          const r = regionFocusFor(ws.name, 'conflict')
          if (r) conflicts.push(r)
        }
      }
      conflicts.push(...buildConflictFlows().map(f => ({
        lat: f.startLat, lng: f.startLng, color: '#ff3b30', intensity: 0.7, kind: 'conflict' as const,
      })))
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
      detach = 0.18
      heatColor = '#ff3b30'
      tint = '#ff6a4a'
      const targets = intent.focus?.length ? intent.focus : []
      for (const e of targets) {
        const r = regionFocusFor(e, 'conflict')
        if (r) regions.push(r)
      }
      routes.push(...buildConflictFlows())
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
    camera: { position: cameraPos, lookAt, kind: cameraKind },
    routes,
    regions,
    conflicts,
    map,
    showOverlays,
    autoRotate,
  }
}

export { MAJOR_HUBS }
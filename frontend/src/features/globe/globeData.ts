import * as THREE from 'three'
import { countries } from '../../data/countries'
import { worldStates } from '../../data/worldState'
import { events as historicalSeed } from '../../data/events'
import type { LiveEvent, GraphLink, RiskUpdate } from '../../types'

export const ENTITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Oil: { lat: 27.0, lng: 52.0 },
  Energy: { lat: 28.5, lng: 48.0 },
  'Natural Gas': { lat: 55.0, lng: 55.0 },
  'Rare Earth': { lat: 35.0, lng: 104.0 },
  Electronics: { lat: 36.0, lng: 138.0 },
  Semiconductors: { lat: 24.0, lng: 121.0 },
  TSMC: { lat: 23.7, lng: 120.96 },
  NVIDIA: { lat: 37.4, lng: -122.0 },
  NASDAQ: { lat: 40.7, lng: -74.0 },
  XOM: { lat: 29.76, lng: -95.37 },
  AAPL: { lat: 37.33, lng: -122.03 },
  Europe: { lat: 50.0, lng: 10.0 },
  Gold: { lat: 46.0, lng: 20.0 },
  Ukraine: { lat: 49.0, lng: 31.0 },
}

const countryCoords = new Map<string, { lat: number; lng: number }>()
for (const c of countries) countryCoords.set(c.name, { lat: c.lat, lng: c.lng })

export function resolveCoords(name: string): { lat: number; lng: number } | null {
  const direct = countryCoords.get(name)
  if (direct) return direct
  const entity = ENTITY_COORDS[name]
  if (entity) return entity
  const state = worldStates.find(w => w.name === name)
  if (state) {
    const idx = worldStates.indexOf(state)
    return { lat: (idx * 13) % 70 - 30, lng: (idx * 37) % 350 - 175 }
  }
  return null
}

export function latLngToPlane(lat: number, lng: number, width: number, depth: number): { x: number; z: number } {
  const x = ((lng + 180) / 360) * width - width / 2
  const z = ((90 - lat) / 180) * depth - depth / 2
  return { x, z }
}

export function buildMapCountryPoints(width = 10, depth = 6.5): { x: number; z: number; color: string; size: number }[] {
  const pts: { x: number; z: number; color: string; size: number }[] = []
  for (const ws of worldStates) {
    const c = resolveCoords(ws.name)
    if (!c) continue
    const p = latLngToPlane(c.lat, c.lng, width, depth)
    const color = ws.riskScore >= 70 ? '#ff4d5e' : ws.riskScore >= 55 ? '#f5b941' : '#38e8ff'
    pts.push({ x: p.x, z: p.z, color, size: 0.05 + (ws.riskScore / 100) * 0.08 })
  }
  return pts
}

export function buildHubMapPoints(width = 10, depth = 6.5): { x: number; z: number; name: string }[] {
  const pts: { x: number; z: number; name: string }[] = []
  const hubs = ['United States', 'China', 'Germany', 'Japan', 'India', 'Brazil', 'Saudi Arabia']
  for (const name of hubs) {
    const c = resolveCoords(name)
    if (!c) continue
    const p = latLngToPlane(c.lat, c.lng, width, depth)
    pts.push({ x: p.x, z: p.z, name })
  }
  return pts
}

export function buildMapLabels(width = 10, depth = 6.5): { x: number; z: number; text: string; color: string; size: number }[] {
  const hubs = new Set(['United States', 'China', 'Germany', 'Japan', 'India', 'Brazil', 'Saudi Arabia'])
  const hot = worldStates
    .filter(ws => ws.riskScore >= 58)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 10)
  const names = Array.from(new Set([...hubs, ...hot.map(h => h.name)]))
  const labels: { x: number; z: number; text: string; color: string; size: number }[] = []
  for (const name of names) {
    const c = resolveCoords(name)
    if (!c) continue
    const p = latLngToPlane(c.lat, c.lng, width, depth)
    const risk = riskFor(name)
    const isHub = hubs.has(name)
    labels.push({
      x: p.x,
      z: p.z,
      text: name,
      color: risk >= 70 ? '#ff8a94' : risk >= 55 ? '#ffd98a' : isHub ? '#ffd54a' : '#7adcff',
      size: isHub ? 0.16 : 0.13,
    })
  }
  return labels
}

export function buildMapFrame(width = 10, depth = 6.5): THREE.Vector3[] {
  const hw = width / 2
  const hd = depth / 2
  return [
    new THREE.Vector3(-hw, 0.02, -hd),
    new THREE.Vector3(hw, 0.02, -hd),
    new THREE.Vector3(hw, 0.02, hd),
    new THREE.Vector3(-hw, 0.02, hd),
    new THREE.Vector3(-hw, 0.02, -hd),
  ]
}

export function riskFor(name: string): number {
  const state = worldStates.find(w => w.name === name)
  return state ? state.riskScore : 50
}

export function buildNodes(mode: string): any[] {
  const nodes: any[] = []
  for (const ws of worldStates) {
    if (ws.riskScore < 40 && mode !== 'world') continue
    const c = resolveCoords(ws.name)
    nodes.push({
      lat: c?.lat ?? 20,
      lng: c?.lng ?? 0,
      label: ws.name,
      radius: 0.05 + (ws.riskScore / 100) * 0.07,
      color: ws.riskScore >= 70 ? '#ff4d5e' : ws.riskScore >= 55 ? '#f5b941' : '#38e8ff',
      pulseColor: ws.riskScore >= 70 ? '#ff4d5e' : '#38e8ff',
      pulseSpeed: 1.4 + (ws.riskScore / 100) * 2,
    })
  }
  return nodes
}

export function buildHeatmap(): any[] {
  return worldStates.map(ws => ({
    lat: resolveCoords(ws.name)?.lat ?? 20,
    lng: resolveCoords(ws.name)?.lng ?? 0,
    intensity: ws.riskScore / 100,
    color: ws.riskScore >= 70 ? '#ff4d5e' : ws.riskScore >= 55 ? '#f5b941' : ws.riskScore >= 40 ? '#38e8ff' : '#1e5f7a',
  }))
}

export function buildArcs(links: GraphLink[]): any[] {
  const arcs: any[] = []
  for (const link of links) {
    const a = resolveCoords(link.source)
    const b = resolveCoords(link.target)
    if (!a || !b) continue
    const strength = link.influence ?? 0.5
    arcs.push({
      startLat: a.lat,
      startLng: a.lng,
      endLat: b.lat,
      endLng: b.lng,
      color: strength >= 0.75 ? '#38e8ff' : strength >= 0.55 ? '#14b8d6' : '#1e5f7a',
      altitude: 0.25 + strength * 0.3,
      stroke: 0.5 + strength * 0.6,
      dashLength: 0.25,
      dashGap: 0.12,
      dashAnimateTime: 2,
    })
  }
  return arcs
}

export function buildRiskPaths(links: GraphLink[]): any[] {
  const paths: any[] = []
  for (const link of links) {
    if (link.influence < 0.6) continue
    const a = resolveCoords(link.source)
    const b = resolveCoords(link.target)
    if (!a || !b) continue
    paths.push({
      startLat: a.lat,
      startLng: a.lng,
      endLat: b.lat,
      endLng: b.lng,
      intensity: link.influence,
      color: '#ff4d5e',
    })
  }
  return paths
}

export function buildEventNodes(liveEvents: LiveEvent[]): any[] {
  return liveEvents.map((e, i) => ({
    lat: e.lat || 20,
    lng: e.lng || (i * 40) % 360 - 180,
    label: e.country,
    radius: 0.06 + (e.severity / 10) * 0.05,
    color: e.severity >= 7 ? '#ff4d5e' : e.severity >= 5 ? '#f5b941' : '#38e8ff',
    pulseColor: e.severity >= 7 ? '#ff4d5e' : '#38e8ff',
    pulseSpeed: 2.2 + (e.severity / 10) * 1.5,
    entity: e.country,
  }))
}

export function buildLabelData(): any[] {
  const hubs = ['United States', 'China', 'Germany', 'Japan', 'India', 'Brazil', 'Saudi Arabia', 'United Kingdom', 'South Korea', 'Taiwan']
  const hot = worldStates
    .filter(ws => ws.riskScore >= 55)
    .slice(0, 10)
    .map(ws => ws.name)
  const names = Array.from(new Set([...hubs, ...hot]))
  return names.flatMap(name => {
    const coords = resolveCoords(name)
    if (!coords) return []
    const risk = worldStates.find(ws => ws.name === name)?.riskScore ?? 0
    return [{
      lat: coords.lat,
      lng: coords.lng,
      text: name,
      size: risk >= 70 ? 0.34 : hubs.includes(name) ? 0.3 : 0.26,
      color: risk >= 70 ? '#ffb0b6' : hubs.includes(name) ? '#f1f5f2' : '#b8d8d2',
      altitude: 0.035,
    }]
  })
}

export function seedLiveEvents(): LiveEvent[] {
  return historicalSeed
    .filter(e => !e.isHistorical)
    .slice(0, 6)
    .map(e => ({
      id: e.id,
      title: e.title,
      countryCode: e.countryCode,
      country: worldStates.find(w => w.code === e.countryCode)?.name ?? e.countryCode,
      type: e.type,
      severity: e.severity,
      lat: e.lat,
      lng: e.lng,
      timestamp: e.timestamp,
      summary: e.description,
      sectors: e.affectedSectors,
    }))
}

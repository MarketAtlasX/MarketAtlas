/**
 * Evidence → Globe overlays.
 *
 * Pure derivation of globe highlights from the canonical `EvidenceObservation`
 * currently shown in the Evidence panel. It reads only fields the backend
 * returns and only emits a marker/arc when an entity has real, resolvable
 * coordinates — coordinates are never invented.
 *
 * Coordinate resolution reuses the existing globe systems:
 *   `resolveCoords` (countries / known entities) then `resolveCompanyLocation`
 *   (existing ticker → headquarters mapping).
 *
 * The returned `signature` changes whenever the visible highlight set changes,
 * so the globe can cheaply detect when it must re-render and when to clear.
 */
import { affectedAssetEntity, causalNodeEntity } from '../../api/evidenceApi'
import type { EvidenceObservation } from '../../api/evidenceApi'
import { resolveCoords } from '../globe/globeData'
import { resolveCompanyLocation } from '../../data/companyLocations'
import type { RouteFlow } from '../globe/SceneDirector'

export type EvidenceHighlightKind = 'selected' | 'affected'

export interface EvidenceGlobePoint {
  lat: number
  lng: number
  entity: string
  label: string
  color: string
  radius: number
  kind: EvidenceHighlightKind
}

export interface EvidenceGlobeRing {
  lat: number
  lng: number
  color: (t: number) => string
  maxR: number
  propagationSpeed: number
  repeatPeriod: number
  altitude: number
}

export interface EvidenceGlobeLabel {
  lat: number
  lng: number
  text: string
  color: string
  size: number
  altitude: number
}

export interface EvidenceGlobeOverlay {
  selected: { entity: string; lat: number; lng: number } | null
  points: EvidenceGlobePoint[]
  arcs: RouteFlow[]
  rings: EvidenceGlobeRing[]
  labels: EvidenceGlobeLabel[]
  signature: string
}

export const EMPTY_EVIDENCE_OVERLAY: EvidenceGlobeOverlay = {
  selected: null,
  points: [],
  arcs: [],
  rings: [],
  labels: [],
  signature: '',
}

const SELECTED_COLOR = '#ffe600'
const AFFECTED_COLOR = '#38e8ff'
const CAUSAL_COLOR = '#ffb020'

/** Resolve real coordinates for an entity name, or `null` when none exist. */
export function resolveEntityCoords(name: string): { lat: number; lng: number } | null {
  const direct = resolveCoords(name)
  if (direct) return direct
  const company = resolveCompanyLocation(name)
  return company ? { lat: company.coords.lat, lng: company.coords.lng } : null
}

function affectedEntityNames(observation: EvidenceObservation, selected: string | null): string[] {
  const names: string[] = []
  const add = (value: string | null | undefined) => {
    const trimmed = value?.trim()
    if (!trimmed) return
    if (selected && trimmed.toLowerCase() === selected.toLowerCase()) return
    names.push(trimmed)
  }

  for (const entity of observation.entities ?? []) add(entity)
  for (const asset of observation.assets ?? []) add(asset)
  for (const impact of observation.impacts ?? []) {
    add(impact.entity_name)
    for (const asset of impact.affected_assets ?? []) add(affectedAssetEntity(asset))
  }

  // Stable de-duplication, order preserved.
  return Array.from(new Set(names))
}

/**
 * Build the globe overlay for the currently displayed evidence. Returns
 * `EMPTY_EVIDENCE_OVERLAY` when there is nothing reliable to show, which is the
 * signal to clear all evidence-driven highlights.
 */
export function buildEvidenceGlobeOverlay(
  selection: string | null,
  observation: EvidenceObservation | null,
): EvidenceGlobeOverlay {
  if (!selection || !observation) return EMPTY_EVIDENCE_OVERLAY

  const points: EvidenceGlobePoint[] = []
  const rings: EvidenceGlobeRing[] = []
  const labels: EvidenceGlobeLabel[] = []
  const arcs: RouteFlow[] = []
  const seen = new Set<string>()

  const selectedCoords = resolveEntityCoords(selection)
  let selected: EvidenceGlobeOverlay['selected'] = null
  if (selectedCoords) {
    selected = { entity: selection, lat: selectedCoords.lat, lng: selectedCoords.lng }
    seen.add(selection.toLowerCase())
    points.push({
      lat: selectedCoords.lat,
      lng: selectedCoords.lng,
      entity: selection,
      label: selection,
      color: SELECTED_COLOR,
      radius: 0.05,
      kind: 'selected',
    })
    rings.push({
      lat: selectedCoords.lat,
      lng: selectedCoords.lng,
      color: t => `rgba(255, 230, 0, ${Math.max(0, 1 - t) * 0.85})`,
      maxR: 5.4,
      propagationSpeed: 2.2,
      repeatPeriod: 1400,
      altitude: 0.024,
    })
    labels.push({ lat: selectedCoords.lat, lng: selectedCoords.lng, text: selection, color: SELECTED_COLOR, size: 0.46, altitude: 0.048 })
  }

  for (const name of affectedEntityNames(observation, selection)) {
    if (seen.has(name.toLowerCase())) continue
    const coords = resolveEntityCoords(name)
    if (!coords) continue
    seen.add(name.toLowerCase())
    points.push({
      lat: coords.lat,
      lng: coords.lng,
      entity: name,
      label: name,
      color: AFFECTED_COLOR,
      radius: 0.04,
      kind: 'affected',
    })
    labels.push({ lat: coords.lat, lng: coords.lng, text: name, color: AFFECTED_COLOR, size: 0.34, altitude: 0.04 })
  }

  // Causal relationships: only when both sides are reliable typed entity
  // references and both resolve to real coordinates.
  for (const edge of observation.causal_chain ?? []) {
    const source = causalNodeEntity(edge, 'source')
    const target = causalNodeEntity(edge, 'target')
    if (!source || !target || source.toLowerCase() === target.toLowerCase()) continue
    const from = resolveEntityCoords(source)
    const to = resolveEntityCoords(target)
    if (!from || !to) continue
    arcs.push({
      startLat: from.lat,
      startLng: from.lng,
      endLat: to.lat,
      endLng: to.lng,
      color: CAUSAL_COLOR,
      intensity: typeof edge.confidence === 'number' ? Math.min(1, Math.max(0.2, edge.confidence)) : 0.5,
      tone: 'gold',
    })
  }

  const signature = [
    selection,
    observation.status,
    points.map(p => `${p.kind}:${p.entity}`).join(','),
    arcs.map(a => `${a.startLat},${a.startLng}->${a.endLat},${a.endLng}`).join('|'),
  ].join('#')

  return { selected, points, arcs, rings, labels, signature }
}

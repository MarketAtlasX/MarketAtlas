import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Globe from 'globe.gl'
import * as THREE from 'three'
import * as topojson from 'topojson-client'
import { createIntent, type VisualizationIntent } from './WorldCore'
import { INTENT_CAPTION } from './visualizationIntent'
import { useWorldStore } from '../../stores/WorldStore'
import { visualizationBus } from '../../assistant/commands/visualizationBus'
import { buildLabelData, buildNodes, resolveCoords } from './globeData'
import { resolveScene, type RouteFlow } from './SceneDirector'
import { worldStates } from '../../data/worldState'

export type GlobeMode = 'world' | 'risk' | 'supply' | 'events' | 'map'

interface CinematicGlobeProps {
  mode?: GlobeMode
  intentOverride?: VisualizationIntent
  onSelect?: (entity: string, lat: number, lng: number) => void
  className?: string
}

/* ─── Semantic Color Grammar ────────────────────────────────── */

const COLORS = {
  PEACE_CAP:    'rgba(255, 213, 74, 0.22)',
  PEACE_STROKE: 'rgba(240, 200, 120, 0.75)',
  TENSION_CAP:    'rgba(245, 166, 35, 0.50)',
  TENSION_STROKE: 'rgba(255, 160, 64, 0.90)',
  WAR_CAP:    'rgba(255, 59, 48, 0.65)',
  WAR_STROKE: 'rgba(255, 77, 94, 0.98)',
  SELECT_CAP:    'rgba(255, 215, 0, 0.85)',
  SELECT_STROKE: '#ffe600',
  GLOBE_BASE: '#05080b',
  GLOBE_EMIT: '#0a1016',
  ATMOSPHERE: '#d9e2ea',
  GRID: 'rgba(223, 232, 239, 0.22)',
  LABEL_GOLD: '#ffd54a',
  LABEL_WHITE: '#f0f4f8',
} as const

/* ─── Route / Arrow Color Classifier ────────────────────────── */

function getArcColor(d: RouteFlow): string[] {
  const tone = d.tone || 'cyan'
  const colorStr = (d.color || '').toLowerCase()

  if (tone === 'red' || colorStr.includes('3b30') || colorStr.includes('4d5e')) {
    return ['rgba(255, 59, 48, 0.25)', '#ff3b30', '#ff4d5e', 'rgba(255, 59, 48, 0.25)']
  }

  if (tone === 'gold' || colorStr.includes('d54a') || colorStr.includes('b020')) {
    return ['rgba(255, 176, 32, 0.25)', '#ffb020', '#ffa040', 'rgba(255, 176, 32, 0.25)']
  }

  if (tone === 'amber' || (tone === 'cyan' && (d.intensity ?? 0.5) < 0.55)) {
    return ['rgba(46, 230, 168, 0.25)', '#2ee6a8', '#2ee6a8', 'rgba(46, 230, 168, 0.25)']
  }

  if (tone === 'cyan') {
    return ['rgba(0, 229, 255, 0.25)', '#00e5ff', '#00e5ff', 'rgba(0, 229, 255, 0.25)']
  }

  return ['rgba(179, 89, 255, 0.25)', '#b359ff', '#b359ff', 'rgba(179, 89, 255, 0.25)']
}

function riskArcAltitudeScale(d: RouteFlow, mode: GlobeMode): number {
  if (mode !== 'risk') return 0.32
  const heat = d.intensity ?? 0.5
  return 0.5 + heat * 0.35
}

function riskArcStroke(d: RouteFlow, mode: GlobeMode): number {
  const heat = d.intensity ?? 0.5
  if (mode !== 'risk') return Math.max(0.25, heat * 0.5)
  return Math.max(0.7, heat * 1.45)
}

function riskArcDashLength(mode: GlobeMode): number {
  return mode === 'risk' ? 0.24 : 0.18
}

function riskArcDashGap(mode: GlobeMode): number {
  return mode === 'risk' ? 0.06 : 0.1
}

function riskArcAnimateTime(mode: GlobeMode): number {
  return mode === 'risk' ? 8000 : 11000
}

/* ─── Mode → Intent ─────────────────────────────────────────── */

function modeToIntent(mode: GlobeMode, selectedEntity: string | null): VisualizationIntent {
  switch (mode) {
    case 'risk':
      return createIntent({
        mode: 'risk',
        scale: 'regional',
        camera: 'zoom_in',
        palette: 'risk',
        transition: 'disintegrate',
        caption: 'GEOPOLITICAL RISK & WAR ZONES',
      })
    case 'supply':
      return createIntent({
        mode: 'supply',
        scale: 'global',
        camera: 'pullback',
        palette: 'map',
        transition: 'particle_reform',
        caption: 'GLOBAL TRADE & SUPPLY ROUTES',
      })
    case 'map':
      return createIntent({
        mode: 'map',
        scale: 'global',
        camera: 'pullback',
        palette: 'map',
        transition: 'particle_reform',
        caption: 'WORLD GEOGRAPHIC MAP',
      })
    case 'events':
      return createIntent({
        mode: 'globe',
        scale: 'global',
        camera: 'pullback',
        transition: 'particle_reform',
        caption: 'LIVE EVENT INTELLIGENCE',
      })
    case 'world':
    default:
      return createIntent({
        mode: selectedEntity ? 'country' : 'globe',
        scale: selectedEntity ? 'country' : 'global',
        focus: selectedEntity ? [selectedEntity] : [],
        origin: selectedEntity,
        camera: selectedEntity ? 'zoom_in' : 'pullback',
        caption: selectedEntity ? `FOCUS :: ${selectedEntity.toUpperCase()}` : 'GLOBAL COMMAND CORE',
      })
  }
}

/* ─── Country Matching & Zone Classification ──────────────────── */

function matchWorldState(featureName: string) {
  if (!featureName) return null
  const n = featureName.toLowerCase().trim()
  return worldStates.find(ws => {
    const wn = ws.name.toLowerCase().trim()
    return wn === n || n.includes(wn) || wn.includes(n)
  })
}

function isSelectedCountry(featureName: string, selectedEntity: string | null): boolean {
  if (!selectedEntity || !featureName) return false
  const fn = featureName.toLowerCase().trim()
  const sn = selectedEntity.toLowerCase().trim()
  return fn === sn || fn.includes(sn) || sn.includes(fn)
}

function polygonCapColor(featureName: string, mode: GlobeMode, selectedEntity: string | null): string {
  if (isSelectedCountry(featureName, selectedEntity)) {
    return COLORS.SELECT_CAP
  }

  const ws = matchWorldState(featureName)
  const risk = ws?.riskScore ?? 45

  if (mode === 'risk' || risk >= 70) {
    if (risk >= 70) return COLORS.WAR_CAP // War / Conflict Zone
    if (risk >= 55) return COLORS.TENSION_CAP // Elevated Tension Zone
  }

  if (risk >= 70) return COLORS.WAR_CAP
  if (risk >= 55) return COLORS.TENSION_CAP
  return COLORS.PEACE_CAP // Peaceful / Stable Yellowish Gold
}

function polygonStrokeColor(featureName: string, selectedEntity: string | null): string {
  if (isSelectedCountry(featureName, selectedEntity)) {
    return COLORS.SELECT_STROKE
  }
  const ws = matchWorldState(featureName)
  const risk = ws?.riskScore ?? 45
  if (risk >= 70) return COLORS.WAR_STROKE
  if (risk >= 55) return COLORS.TENSION_STROKE
  return COLORS.PEACE_STROKE
}

function polygonAltitude(featureName: string, selectedEntity: string | null): number {
  if (isSelectedCountry(featureName, selectedEntity)) return 0.028
  const ws = matchWorldState(featureName)
  const risk = ws?.riskScore ?? 45
  if (risk >= 70) return 0.018
  if (risk >= 55) return 0.014
  return 0.010
}

/* ─── Component ─────────────────────────────────────────────── */

export default function CinematicGlobe({ mode = 'world', intentOverride, onSelect, className = '' }: CinematicGlobeProps) {
  const { state, selectEntity } = useWorldStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<any>(null)
  const onSelectRef = useRef(onSelect)
  const selectEntityRef = useRef(selectEntity)
  const [focusIntent, setFocusIntent] = useState<VisualizationIntent | null>(null)
  const [countries, setCountries] = useState<any[]>([])
  const frameRef = useRef<number | null>(null)
  const prevSceneHash = useRef<string>('')

  onSelectRef.current = onSelect
  selectEntityRef.current = selectEntity

  useEffect(() => visualizationBus.subscribe(setFocusIntent), [])

  useEffect(() => {
    import('world-atlas/countries-110m.json').then((topology: any) => {
      const geoCountries = topojson.feature(topology, topology.objects.countries)
      setCountries((geoCountries as any).features || [])
    })
  }, [])

  const intent = useMemo(() => {
    if (intentOverride) return intentOverride
    if (focusIntent) return focusIntent
    return modeToIntent(mode, state.selectedEntity)
  }, [focusIntent, intentOverride, mode, state.selectedEntity])

  const caption = intent.caption ?? INTENT_CAPTION[intent.mode] ?? 'GLOBAL COMMAND CORE'
  const scene = useMemo(() => resolveScene(intent), [intent])
  const labels = useMemo(() => buildLabelData(), [])
  const nodes = useMemo(() => buildNodes('world'), [])

  const handleEntityClick = useCallback((entityName: string, lat: number, lng: number) => {
    selectEntityRef.current(entityName)
    setFocusIntent(
      createIntent({
        mode: 'country',
        scale: 'country',
        focus: [entityName],
        origin: entityName,
        camera: 'zoom_in',
        caption: `FOCUS :: ${entityName.toUpperCase()}`,
      }),
    )
    onSelectRef.current?.(entityName, lat, lng)
  }, [])

  useEffect(() => {
    if (!containerRef.current || globeRef.current) return

    const globe = new (Globe as any)(containerRef.current, { animateIn: false })
      .width(containerRef.current.clientWidth)
      .height(containerRef.current.clientHeight)
      .backgroundColor('rgba(0,0,0,0)')

      .showGlobe(true)
      .showAtmosphere(true)
      .showGraticules(true)
      .atmosphereColor(COLORS.ATMOSPHERE)
      .atmosphereAltitude(0.09)

      .polygonsData([])
      .polygonCapColor((d: any) => polygonCapColor(d?.properties?.name || '', mode, state.selectedEntity))
      .polygonSideColor(() => 'rgba(11, 15, 19, 0.92)')
      .polygonStrokeColor((d: any) => polygonStrokeColor(d?.properties?.name || '', state.selectedEntity))
      .polygonAltitude((d: any) => polygonAltitude(d?.properties?.name || '', state.selectedEntity))
      .polygonCapCurvatureResolution(5)

      .arcsData([])
      .arcStartLat((d: any) => d.startLat)
      .arcStartLng((d: any) => d.startLng)
      .arcEndLat((d: any) => d.endLat)
      .arcEndLng((d: any) => d.endLng)
      .arcColor((d: any) => getArcColor(d))
      .arcAltitudeAutoScale(riskArcAltitudeScale)
      .arcStroke((d: any) => riskArcStroke(d, mode))
      .arcDashLength(riskArcDashLength(mode))
      .arcDashGap(riskArcDashGap(mode))
      .arcDashAnimateTime(riskArcAnimateTime(mode))

      .pointsData([])
      .pointLat((d: any) => d.lat)
      .pointLng((d: any) => d.lng)
      .pointColor((d: any) => d.color || COLORS.LABEL_WHITE)
      .pointRadius((d: any) => Math.min(0.18, (d.radius ?? 0.08) * 1.9))
      .pointAltitude(0.016)

      .labelsData([])
      .labelLat((d: any) => d.lat)
      .labelLng((d: any) => d.lng)
      .labelText((d: any) => d.text)
      .labelColor((d: any) => d.color || COLORS.LABEL_WHITE)
      .labelSize((d: any) => (d.size ?? 0.3) * 1.02)
      .labelResolution(2)
      .labelDotRadius(0.055)
      .labelIncludeDot(true)
      .labelAltitude(0.02)

      .onPolygonClick((polygon: any) => {
        const countryName = polygon?.properties?.name
        if (countryName) {
          const coords = resolveCoords(countryName)
          handleEntityClick(countryName, coords?.lat ?? 20, coords?.lng ?? 0)
        }
      })
      .onPointClick((d: any) => {
        const entityName = d.entity || d.label
        if (entityName) {
          const coords = resolveCoords(entityName)
          handleEntityClick(entityName, coords?.lat ?? d.lat, coords?.lng ?? d.lng)
        }
      })

    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(COLORS.GLOBE_BASE),
      emissive: new THREE.Color(COLORS.GLOBE_EMIT),
      emissiveIntensity: 0.35,
      shininess: 4,
      specular: new THREE.Color('#161d25'),
      transparent: true,
      opacity: 0.98,
    })
    globe.globeMaterial(material)
    globe.globeImageUrl('')

    globe.controls().enableZoom = true
    globe.controls().enablePan = false
    globe.controls().minDistance = 165
    globe.controls().maxDistance = 480
    globe.controls().autoRotate = true
    globe.controls().autoRotateSpeed = 0.11
    globe.controls().enableDamping = true
    globe.controls().dampingFactor = 0.06
    globe.controls().rotateSpeed = 0.42

    globe.pointOfView({ lat: 18, lng: 18, altitude: 1.92 }, 0)

    globeRef.current = globe

    const handleResize = () => {
      if (!containerRef.current || !globeRef.current) return
      globe.width(containerRef.current.clientWidth).height(containerRef.current.clientHeight)
    }
    window.addEventListener('resize', handleResize)
    handleResize()

    return () => {
      window.removeEventListener('resize', handleResize)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      globe.controls().dispose()
      containerRef.current?.replaceChildren()
      globeRef.current = null
    }
  }, [handleEntityClick])

  useEffect(() => {
    const globe = globeRef.current
    if (!globe) return

    const sceneHash = JSON.stringify({
      mode,
      selected: state.selectedEntity,
      routeCount: scene.routes.length,
      countryCount: countries.length,
      intentMode: intent.mode,
    })

    if (sceneHash === prevSceneHash.current && countries.length > 0) return
    prevSceneHash.current = sceneHash

    if (frameRef.current) cancelAnimationFrame(frameRef.current)

    frameRef.current = requestAnimationFrame(() => {
      if (countries.length > 0) {
        globe
          .polygonsData(countries)
          .polygonCapColor((d: any) => polygonCapColor(d?.properties?.name || '', mode, state.selectedEntity))
          .polygonStrokeColor((d: any) => polygonStrokeColor(d?.properties?.name || '', state.selectedEntity))
          .polygonAltitude((d: any) => polygonAltitude(d?.properties?.name || '', state.selectedEntity))
      }

      globe
        .arcAltitudeAutoScale(riskArcAltitudeScale)
        .arcStroke((d: any) => riskArcStroke(d, mode))
        .arcDashLength(riskArcDashLength(mode))
        .arcDashGap(riskArcDashGap(mode))
        .arcDashAnimateTime(riskArcAnimateTime(mode))
        .arcsData(scene.routes)

      globe.pointsData(scene.showOverlays ? nodes : [])

      const activeLabels = scene.showOverlays
        ? labels.map((l: any) => {
            const isSelected = state.selectedEntity && l.text.toLowerCase() === state.selectedEntity.toLowerCase()
            return {
              ...l,
              color: isSelected ? COLORS.SELECT_STROKE : COLORS.LABEL_GOLD,
              size: isSelected ? 0.45 : (l.size ?? 0.3),
            }
          })
        : []
      globe.labelsData(activeLabels)

      globe.controls().autoRotate = scene.autoRotate
      globe.controls().autoRotateSpeed = scene.autoRotate ? 0.11 : 0

      const focusTarget = intent.focus?.[0] || intent.origin
      if (focusTarget) {
        const coords = resolveCoords(focusTarget)
        if (coords) {
          globe.pointOfView({ lat: coords.lat, lng: coords.lng, altitude: 1.58 }, 1000)
        }
      } else {
        globe.pointOfView({ lat: 18, lng: 18, altitude: 1.92 }, 900)
      }
    })
  }, [countries, intent, labels, mode, nodes, scene, state.selectedEntity])

  return (
    <div className={`cinematic-globe globe-container relative w-full h-full ${className}`}>
      <div ref={containerRef} className="cinematic-globe__canvas absolute inset-0" />

      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_45%,rgba(243,247,250,0.06),transparent_34%),radial-gradient(circle_at_50%_50%,transparent_56%,rgba(2,4,6,0.62)_100%)]" />
      <div className="cinematic-globe__vignette pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_24%,transparent_76%,rgba(255,255,255,0.02))]" />

      <div className="cinematic-globe__caption absolute bottom-14 left-4 z-10 pointer-events-none select-none font-mono">
        <div key={caption} className="stream-in text-[11px] tracking-[0.3em] text-[var(--accent)] drop-shadow">
          {caption}
        </div>
        <div className="mt-1 text-[9px] tracking-widest text-[rgba(95,125,153,0.9)]">
          {mode.toUpperCase()} :: {intent.scale.toUpperCase()}
        </div>
      </div>
    </div>
  )
}

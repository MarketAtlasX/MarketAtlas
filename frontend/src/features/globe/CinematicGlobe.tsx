import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Globe from 'globe.gl'
import * as THREE from 'three'
import * as topojson from 'topojson-client'
import { createIntent, type VisualizationIntent } from './WorldCore'
import { INTENT_CAPTION } from './visualizationIntent'
import { useWorldStore } from '../../stores/WorldStore'
import { visualizationBus } from '../../assistant/commands/visualizationBus'
import { intelligenceBus } from '../../services/intelligenceBus'
import { buildLabelData, buildNodes, resolveCoords } from './globeData'
import { resolveScene, type RouteFlow } from './SceneDirector'
import { worldStates } from '../../data/worldState'
import { theme } from './globeTheme'
import { createCelestialSpace, type CelestialSpaceHandle } from './celestialSpace'
import { resolveCompanyLocation, type CompanyLocation } from '../../data/companyLocations'
import type { CausalGraph } from '../prediction-space/causalGraphApi'

export type GlobeMode = 'world' | 'risk' | 'supply' | 'events' | 'map'

interface CinematicGlobeProps {
  mode?: GlobeMode
  intentOverride?: VisualizationIntent
  onSelect?: (entity: string, lat: number, lng: number) => void
  className?: string
}

/*
 * VISUAL PHILOSOPHY:
 * The globe acts as a dark, subtle intelligence command center floating in realistic outer space.
 * - Deep outer space with 6,000+ stars, the Milky Way galactic plane, and nebulae.
 * - A dark, transparent Earth sphere floating in the cosmic void.
 * - Countries are subtle outlines with muted gold/amber/red fills based on risk.
 * - When a stock is selected, the globe flies directly to the company's state/city headquarters,
 *   emanates pulsing golden radar rings, marks key facilities/supply chain nodes, and opens a HUD intel badge.
 */

/* ─── Route / Arrow Color Classifier ────────────────────────── */

function getArcColor(d: RouteFlow): string[] {
  const tone = d.tone || 'cyan'
  const colorStr = (d.color || '').toLowerCase()

  if (tone === 'red' || colorStr.includes('3b30') || colorStr.includes('4d5e')) {
    return theme.arc.red
  }

  if (tone === 'gold' || colorStr.includes('d54a') || colorStr.includes('b020') || colorStr.includes('ffe600')) {
    return theme.arc.gold
  }

  if (tone === 'amber' || (tone === 'cyan' && (d.intensity ?? 0.5) < 0.55)) {
    return theme.arc.amber
  }

  if (tone === 'cyan') {
    return theme.arc.cyan
  }

  return theme.arc.purple
}

function riskArcAltitudeScale(d: RouteFlow, mode: GlobeMode): number {
  if (mode !== 'risk') return 0.32
  const heat = d.intensity ?? 0.5
  return 0.5 + heat * 0.35
}

function riskArcStroke(d: RouteFlow, mode: GlobeMode): number {
  const heat = d.intensity ?? 0.5
  if (mode !== 'risk') return Math.min(0.4, Math.max(0.15, heat * 0.4))
  return Math.min(0.7, Math.max(0.3, heat * 0.8))
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
    return theme.polygon.selected.cap
  }

  const ws = matchWorldState(featureName)
  const risk = ws?.riskScore ?? 45

  if (mode === 'risk' || risk >= 70) {
    if (risk >= 70) return theme.polygon.conflict.cap
    if (risk >= 55) return theme.polygon.tension.cap
  }

  if (risk >= 70) return theme.polygon.conflict.cap
  if (risk >= 55) return theme.polygon.tension.cap
  return theme.polygon.stable.cap
}

function polygonStrokeColor(featureName: string, selectedEntity: string | null): string {
  if (isSelectedCountry(featureName, selectedEntity)) {
    return theme.polygon.selected.stroke
  }
  const ws = matchWorldState(featureName)
  const risk = ws?.riskScore ?? 45
  if (risk >= 70) return theme.polygon.conflict.stroke
  if (risk >= 55) return theme.polygon.tension.stroke
  return theme.polygon.stable.stroke
}

function polygonAltitude(featureName: string, selectedEntity: string | null): number {
  if (isSelectedCountry(featureName, selectedEntity)) return theme.polygon.selected.altitude
  const ws = matchWorldState(featureName)
  const risk = ws?.riskScore ?? 45
  if (risk >= 70) return theme.polygon.conflict.altitude
  if (risk >= 55) return theme.polygon.tension.altitude
  return theme.polygon.stable.altitude
}

/* ─── Component ─────────────────────────────────────────────── */

export default function CinematicGlobe({ mode = 'world', intentOverride, onSelect, className = '' }: CinematicGlobeProps) {
  const { state, selectEntity } = useWorldStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<any>(null)
  const celestialRef = useRef<CelestialSpaceHandle | null>(null)
  const onSelectRef = useRef(onSelect)
  const selectEntityRef = useRef(selectEntity)
  const [focusIntent, setFocusIntent] = useState<VisualizationIntent | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<CompanyLocation | null>(null)
  const [projectedCausalGraph, setProjectedCausalGraph] = useState<CausalGraph | null>(null)
  const [countries, setCountries] = useState<any[]>([])
  const frameRef = useRef<number | null>(null)
  const celestialAnimRef = useRef<number | null>(null)
  const prevSceneHash = useRef<string>('')

  onSelectRef.current = onSelect
  selectEntityRef.current = selectEntity

  useEffect(() => visualizationBus.subscribe(setFocusIntent), [])

  // Listen to intelligenceBus for stock selection, ticker queries & causal graph projection
  useEffect(() => {
    return intelligenceBus.subscribe(event => {
      if (event.type === 'STOCK_SELECTED') {
        const comp: CompanyLocation | null = event.payload?.company ?? resolveCompanyLocation(event.payload?.ticker)
        if (comp) {
          setSelectedCompany(comp)
          selectEntityRef.current(comp.headquarters.country)
        }
      } else if (event.type === 'TICKER_REQUESTED' || event.type === 'TICKER_PREDICTED') {
        const comp = resolveCompanyLocation(event.payload?.ticker)
        if (comp) {
          setSelectedCompany(comp)
          selectEntityRef.current(comp.headquarters.country)
        }
      } else if (event.type === 'CAUSAL_GRAPH_PROJECTED') {
        const graph: CausalGraph = event.payload
        setProjectedCausalGraph(graph)
        if (graph && graph.nodes.length > 0) {
          const focalNode = graph.nodes.find(n => n.type === 'company_hq') || graph.nodes[0]
          globeRef.current?.pointOfView({ lat: focalNode.coords.lat, lng: focalNode.coords.lng, altitude: 1.62 }, 1200)
        }
      }
    })
  }, [])

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

  const caption = selectedCompany
    ? `${selectedCompany.ticker} :: ${selectedCompany.headquarters.city.toUpperCase()}, ${selectedCompany.headquarters.country.toUpperCase()}`
    : intent.caption ?? INTENT_CAPTION[intent.mode] ?? 'GLOBAL COMMAND CORE'

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
      .atmosphereColor(theme.atmosphere.color)
      .atmosphereAltitude(theme.atmosphere.altitude)

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
      .pointColor((d: any) => d.color || theme.label.white)
      .pointRadius((d: any) => Math.min(theme.node.maxRadius, (d.radius ?? 0.04) * 1.5))
      .pointAltitude((d: any) => d.altitude ?? theme.node.altitudeOffset)

      .labelsData([])
      .labelLat((d: any) => d.lat)
      .labelLng((d: any) => d.lng)
      .labelText((d: any) => d.text)
      .labelColor((d: any) => d.color || theme.label.white)
      .labelSize((d: any) => (d.size ?? 0.3) * 1.02)
      .labelResolution(2)
      .labelDotRadius(0.035)
      .labelIncludeDot(true)
      .labelAltitude((d: any) => d.altitude ?? 0.02)

      .ringsData([])
      .ringColor((d: any) => d.color || (() => 'rgba(255, 215, 0, 0.8)'))
      .ringMaxRadius((d: any) => d.maxR || 5)
      .ringPropagationSpeed((d: any) => d.propagationSpeed || 2)
      .ringRepeatPeriod((d: any) => d.repeatPeriod || 1000)
      .ringAltitude((d: any) => d.altitude || 0.02)

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
      color: new THREE.Color(theme.globe.base),
      emissive: new THREE.Color(theme.globe.emissive),
      emissiveIntensity: theme.globe.emissiveIntensity,
      shininess: 4,
      specular: new THREE.Color('#161d25'),
      transparent: true,
      opacity: theme.globe.opacity,
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

    // ── Outer Space Celestial System Integration ──────────────────────────
    const sceneObj = globe.scene()
    if (sceneObj) {
      celestialRef.current = createCelestialSpace(sceneObj)
    }

    const animateCelestial = () => {
      celestialRef.current?.update(Date.now())
      celestialAnimRef.current = requestAnimationFrame(animateCelestial)
    }
    celestialAnimRef.current = requestAnimationFrame(animateCelestial)

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
      if (celestialAnimRef.current) cancelAnimationFrame(celestialAnimRef.current)
      celestialRef.current?.dispose()
      celestialRef.current = null
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
      company: selectedCompany?.ticker,
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

      // ── Company-Specific Arcs & Supply Chains ───────────────────────────
      const companyArcs: RouteFlow[] = selectedCompany
        ? [
            ...selectedCompany.facilities.map(f => ({
              startLat: selectedCompany.coords.lat,
              startLng: selectedCompany.coords.lng,
              endLat: f.lat,
              endLng: f.lng,
              color: '#ffe600',
              intensity: 0.95,
              tone: 'gold' as const,
            })),
            ...selectedCompany.supplyChain.map(s => ({
              startLat: selectedCompany.coords.lat,
              startLng: selectedCompany.coords.lng,
              endLat: s.lat,
              endLng: s.lng,
              color: '#38e8ff',
              intensity: 0.85,
              tone: 'cyan' as const,
            })),
          ]
        : []

      globe
        .arcAltitudeAutoScale(riskArcAltitudeScale)
        .arcStroke((d: any) => riskArcStroke(d, mode))
        .arcDashLength(riskArcDashLength(mode))
        .arcDashGap(riskArcDashGap(mode))
        .arcDashAnimateTime(riskArcAnimateTime(mode))

      // ── Causal Graph Reasoning Arcs ─────────────────────────────────────
      const causalArcs: RouteFlow[] = projectedCausalGraph
        ? projectedCausalGraph.edges.map(e => {
            const src = projectedCausalGraph.nodes.find(n => n.id === e.source)
            const dst = projectedCausalGraph.nodes.find(n => n.id === e.target)
            return {
              startLat: src?.coords.lat ?? 0,
              startLng: src?.coords.lng ?? 0,
              endLat: dst?.coords.lat ?? 0,
              endLng: dst?.coords.lng ?? 0,
              color: e.tone === 'red' ? '#ff4d5e' : e.tone === 'gold' ? '#ffe600' : '#38e8ff',
              intensity: e.strength,
              tone: (e.tone === 'red' ? 'red' : e.tone === 'gold' ? 'gold' : 'cyan') as any,
            }
          })
        : []

      globe.arcsData([...scene.routes, ...companyArcs, ...causalArcs])

      // ── Company-Specific Points & Facilities ────────────────────────────
      const companyPoints = selectedCompany
        ? [
            {
              lat: selectedCompany.coords.lat,
              lng: selectedCompany.coords.lng,
              color: '#ffe600',
              radius: 0.13,
              altitude: 0.035,
              entity: `${selectedCompany.ticker} HQ`,
              label: `${selectedCompany.ticker} HEADQUARTERS`,
            },
            ...selectedCompany.facilities.map(f => ({
              lat: f.lat,
              lng: f.lng,
              color: '#38e8ff',
              radius: 0.08,
              altitude: 0.025,
              entity: `${f.type}: ${f.city}`,
              label: `${f.name} (${f.type})`,
            })),
            ...selectedCompany.supplyChain.map(s => ({
              lat: s.lat,
              lng: s.lng,
              color: '#2ee6a8',
              radius: 0.065,
              altitude: 0.02,
              entity: s.target,
              label: `${s.target} [${s.relationship}]`,
            })),
          ]
        : []

      const causalPoints = projectedCausalGraph
        ? projectedCausalGraph.nodes.map(n => ({
            lat: n.coords.lat,
            lng: n.coords.lng,
            color: n.color,
            radius: n.type === 'company_hq' ? 0.13 : n.type === 'geopolitical_risk' ? 0.11 : 0.08,
            altitude: 0.035,
            entity: n.label,
            label: `${n.label} [${n.type.toUpperCase()}]`,
          }))
        : []

      globe.pointsData([...(scene.showOverlays ? nodes : []), ...companyPoints, ...causalPoints])

      // ── Company-Specific Labels ────────────────────────────────────────
      const companyLabels = selectedCompany
        ? [
            {
              lat: selectedCompany.coords.lat,
              lng: selectedCompany.coords.lng,
              text: `${selectedCompany.ticker} HQ · ${selectedCompany.headquarters.city}${selectedCompany.headquarters.state ? ', ' + selectedCompany.headquarters.state : ''} (${selectedCompany.headquarters.countryCode})`,
              color: '#ffe600',
              size: 0.48,
              altitude: 0.045,
            },
            ...selectedCompany.facilities.map(f => ({
              lat: f.lat,
              lng: f.lng,
              text: `${f.type}: ${f.city}, ${f.country}`,
              color: '#7adcff',
              size: 0.32,
              altitude: 0.03,
            })),
          ]
        : []

      const causalLabels = projectedCausalGraph
        ? projectedCausalGraph.nodes.map(n => ({
            lat: n.coords.lat,
            lng: n.coords.lng,
            text: `${n.label} (${n.city})`,
            color: n.color,
            size: n.type === 'company_hq' ? 0.48 : 0.35,
            altitude: 0.045,
          }))
        : []

      const activeLabels = scene.showOverlays
        ? labels.map((l: any) => {
            const isSelected = state.selectedEntity && l.text.toLowerCase() === state.selectedEntity.toLowerCase()
            return {
              ...l,
              color: isSelected ? theme.polygon.selected.stroke : theme.label.gold,
              size: isSelected ? 0.45 : (l.size ?? 0.3),
            }
          })
        : []
      globe.labelsData([...activeLabels, ...companyLabels, ...causalLabels])

      // ── Pulsing Concentric Radar Rings at Company HQ & Causal Flashpoints ──
      const rings: any[] = []
      if (selectedCompany) {
        rings.push({
          lat: selectedCompany.coords.lat,
          lng: selectedCompany.coords.lng,
          maxR: 5.2,
          propagationSpeed: 2.2,
          repeatPeriod: 1400,
          altitude: 0.022,
          color: () => (t: number) => `rgba(255, 215, 0, ${Math.max(0, 1 - t) * 0.85})`,
        })
      }
      if (projectedCausalGraph) {
        projectedCausalGraph.nodes.forEach(n => {
          if (n.type === 'geopolitical_risk') {
            rings.push({
              lat: n.coords.lat,
              lng: n.coords.lng,
              maxR: 5.6,
              propagationSpeed: 2.6,
              repeatPeriod: 1100,
              altitude: 0.025,
              color: () => (t: number) => `rgba(255, 77, 94, ${Math.max(0, 1 - t) * 0.85})`,
            })
          } else if (n.type === 'company_hq' && !selectedCompany) {
            rings.push({
              lat: n.coords.lat,
              lng: n.coords.lng,
              maxR: 4.8,
              propagationSpeed: 2.2,
              repeatPeriod: 1400,
              altitude: 0.022,
              color: () => (t: number) => `rgba(255, 215, 0, ${Math.max(0, 1 - t) * 0.85})`,
            })
          }
        })
      }

      globe
        .ringsData(rings)
        .ringColor((d: any) => d.color || (() => 'rgba(255, 215, 0, 0.8)'))
        .ringMaxRadius((d: any) => d.maxR || 5.0)
        .ringPropagationSpeed((d: any) => d.propagationSpeed || 2.2)
        .ringRepeatPeriod((d: any) => d.repeatPeriod || 1400)
        .ringAltitude((d: any) => d.altitude || 0.022)

      globe.controls().autoRotate = (selectedCompany || projectedCausalGraph) ? false : scene.autoRotate
      globe.controls().autoRotateSpeed = scene.autoRotate ? 0.11 : 0

      // ── Camera Navigation ──────────────────────────────────────────────
      if (projectedCausalGraph && projectedCausalGraph.nodes.length > 0) {
        const focal = projectedCausalGraph.nodes.find(n => n.type === 'company_hq') || projectedCausalGraph.nodes[0]
        globe.pointOfView({ lat: focal.coords.lat, lng: focal.coords.lng, altitude: 1.62 }, 1200)
      } else if (selectedCompany) {
        globe.pointOfView(
          {
            lat: selectedCompany.coords.lat,
            lng: selectedCompany.coords.lng,
            altitude: 1.35,
          },
          1200,
        )
      } else {
        const focusTarget = intent.focus?.[0] || intent.origin
        if (focusTarget) {
          const coords = resolveCoords(focusTarget)
          if (coords) {
            globe.pointOfView({ lat: coords.lat, lng: coords.lng, altitude: 1.58 }, 1000)
          }
        } else {
          globe.pointOfView({ lat: 18, lng: 18, altitude: 1.92 }, 900)
        }
      }
    })
  }, [countries, intent, labels, mode, nodes, scene, selectedCompany, state.selectedEntity])

  return (
    <div className={`cinematic-globe globe-container relative w-full h-full overflow-hidden ${className}`}>
      {/* ─── Deep Outer Space Cosmic Canvas Backdrop ──────────────── */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[#020408]" />
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_rgba(24,40,68,0.32)_0%,_rgba(8,16,28,0.75)_50%,_rgba(1,3,6,0.98)_100%)]" />
      <div className="pointer-events-none absolute inset-0 z-0 opacity-40 bg-[radial-gradient(circle_at_25%_25%,rgba(138,43,226,0.14)_0%,transparent_50%),radial-gradient(circle_at_80%_75%,rgba(0,229,255,0.09)_0%,transparent_50%)]" />

      {/* ─── WebGL Globe Canvas ───────────────────────────────────── */}
      <div ref={containerRef} className="cinematic-globe__canvas absolute inset-0 z-10" />

      {/* ─── Cinematic Vignette ───────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_50%,transparent_54%,rgba(1,3,6,0.72)_100%)]" />

      {/* ─── Selected Company Location Intel Overlay Badge ────────── */}
      {selectedCompany && (
        <div className="absolute top-16 left-4 z-20 pointer-events-auto stream-in flex flex-col gap-1.5 rounded-lg border border-[rgba(255,215,0,0.4)] bg-[rgba(4,8,14,0.92)] backdrop-blur-md p-3.5 shadow-[0_0_24px_rgba(255,215,0,0.18)] max-w-xs font-mono">
          <div className="flex items-center justify-between gap-2 border-b border-[rgba(255,215,0,0.25)] pb-1.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffe600] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ffe600]" />
              </span>
              <span className="text-[13px] font-bold text-[#ffe600] tracking-wider">{selectedCompany.ticker}</span>
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-[rgba(255,215,0,0.12)] text-[#ffd54a] border border-[rgba(255,215,0,0.3)]">
                HQ LOCATION
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCompany(null)}
              className="text-[11px] text-[var(--text-lo)] hover:text-[var(--text-hi)] transition-colors px-1"
              title="Close company intel"
            >
              ✕
            </button>
          </div>

          <div className="text-[11px] font-semibold text-[var(--text-hi)] mt-0.5 leading-snug">
            {selectedCompany.name}
          </div>

          <div className="text-[10px] text-[var(--accent)] flex items-start gap-1 leading-snug">
            <span>📍</span>
            <span>
              {selectedCompany.headquarters.city}
              {selectedCompany.headquarters.state ? `, ${selectedCompany.headquarters.state}` : ''}
              <span className="text-[var(--text-mid)]"> · {selectedCompany.headquarters.country}</span>
            </span>
          </div>

          {selectedCompany.headquarters.address && (
            <div className="text-[8px] text-[var(--text-lo)] pl-4">
              {selectedCompany.headquarters.address}
            </div>
          )}

          <div className="flex items-center justify-between text-[8px] text-[var(--text-lo)] border-t border-[var(--line)] pt-1 mt-0.5">
            <span>COORDS: {selectedCompany.coords.lat.toFixed(4)}°N, {selectedCompany.coords.lng.toFixed(4)}°W</span>
            <span className="text-[var(--text-mid)]">{selectedCompany.headquarters.countryCode}</span>
          </div>

          <div className="text-[9px] text-[var(--text-mid)] line-clamp-2 mt-0.5 leading-tight">
            {selectedCompany.sector}
          </div>

          {selectedCompany.facilities.length > 0 && (
            <div className="mt-1 pt-1 border-t border-[var(--line)]">
              <span className="text-[8px] tracking-wider text-[var(--text-lo)] block mb-1">KEY FACILITIES & HUBS</span>
              <div className="flex flex-wrap gap-1">
                {selectedCompany.facilities.map(f => (
                  <span
                    key={f.name}
                    className="text-[8px] px-1.5 py-0.5 rounded bg-[rgba(56,232,255,0.08)] text-[var(--accent)] border border-[rgba(56,232,255,0.2)]"
                  >
                    {f.type}: {f.city}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Projected Causal Reasoning Vector Card ────────────────── */}
      {projectedCausalGraph && (
        <div className="absolute top-16 right-4 z-20 pointer-events-auto stream-in flex flex-col gap-1.5 rounded-lg border border-[rgba(56,232,255,0.4)] bg-[rgba(4,8,14,0.92)] backdrop-blur-md p-3.5 shadow-[0_0_24px_rgba(56,232,255,0.18)] max-w-sm font-mono">
          <div className="flex items-center justify-between gap-2 border-b border-[rgba(56,232,255,0.25)] pb-1.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
              </span>
              <span className="text-[12px] font-bold text-[var(--accent)] tracking-wider">
                CAUSAL CHAIN: {projectedCausalGraph.ticker}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setProjectedCausalGraph(null)}
              className="text-[11px] text-[var(--text-lo)] hover:text-[var(--text-hi)] transition-colors px-1"
              title="Close causal vector"
            >
              ✕
            </button>
          </div>

          <div className="text-[10px] text-[#ff4d5e] font-semibold mt-0.5 flex items-center gap-1">
            <span>⚡ TRIGGER:</span>
            <span>{projectedCausalGraph.primary_risk_vector}</span>
          </div>

          <div className="text-[9px] text-[var(--text-mid)] leading-snug">
            {projectedCausalGraph.reasoning_summary}
          </div>

          <div className="mt-1 pt-1 border-t border-[var(--line)] flex flex-wrap gap-1">
            {projectedCausalGraph.nodes.map(n => (
              <span
                key={n.id}
                className="text-[8px] px-1.5 py-0.5 rounded border"
                style={{
                  borderColor: n.color,
                  color: n.color,
                  backgroundColor: `${n.color}15`,
                }}
              >
                {n.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ─── Caption HUD ──────────────────────────────────────────── */}
      <div className="cinematic-globe__caption absolute bottom-14 left-4 z-10 pointer-events-none select-none font-mono">
        <div key={caption} className="stream-in text-[11px] tracking-[0.3em] text-[var(--accent)] drop-shadow">
          {caption}
        </div>
        <div className="mt-1 text-[9px] tracking-widest text-[rgba(95,125,153,0.9)]">
          {selectedCompany ? `ASSET HQ :: ${selectedCompany.ticker}` : `${mode.toUpperCase()} :: ${intent.scale.toUpperCase()}`}
        </div>
      </div>
    </div>
  )
}

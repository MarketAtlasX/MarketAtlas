import { useRef, useState, useCallback, useEffect } from 'react'
import { GlobeScene, type GlobeSceneHandle } from '../globe'
import { countries, type Country } from '../data/countries'
import { tradeRoutes, militaryRelations, portLocations } from '../data/relations'
import { events, historicalEvents, getSimilarEvents } from '../data/events'
import type { GeoEvent } from '../data/events'
import { defaultGraph } from '../data/graphData'
import type { GraphEdge } from '../data/graphData'
import { getAllSupplyChainLinks, supplyChainPaths, getSupplyChainCountries } from '../data/supplyChains'
import type { SupplyChainPath } from '../data/supplyChains'
import { worldStates, getRiskColor } from '../data/worldState'
import { getForecastAtDay } from '../data/forecasts'
import type { GlobeMode, AgentMode } from './GlobeControls'
import { riskScoreToColor, countryNameToCode as nameToCode } from '../hooks/useWorldState'
import type { LiveCountryState } from '../hooks/useWorldState'
import { haversineDistance } from '../utils/geo'

interface GlobeViewProps {
  selectedCountry: Country | null
  onCountryClick: (country: Country) => void
  onOpenMap: () => void
  mode: GlobeMode
  agentMode: AgentMode
  forecastDay: number
  selectedEvent?: GeoEvent | null
  onEventClick?: (event: GeoEvent) => void
  activeLayers: Record<string, boolean>
  onSupplyChainClick?: (path: SupplyChainPath) => void
  liveWorldState?: LiveCountryState[] | null
}

function findNearestCountry(lat: number, lng: number): Country | null {
  let nearest: Country | null = null
  let minDist = Infinity
  for (const c of countries) {
    const dist = haversineDistance(lat, lng, c.lat, c.lng)
    if (dist < minDist && dist < 2000) {
      minDist = dist
      nearest = c
    }
  }
  return nearest
}

export default function GlobeView({
  selectedCountry, onCountryClick, onOpenMap,
  mode, agentMode, forecastDay, selectedEvent, onEventClick,
  activeLayers, onSupplyChainClick, liveWorldState,
}: GlobeViewProps) {
  const globeRef = useRef<GlobeSceneHandle>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const clickLockRef = useRef(false)
  const mapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (selectedCountry && globeRef.current) {
      globeRef.current.focusCountry(selectedCountry.lat, selectedCountry.lng)
    }
  }, [selectedCountry])

  useEffect(() => {
    if (selectedEvent && globeRef.current) {
      globeRef.current.focusEvent(selectedEvent.lat, selectedEvent.lng)
    }
  }, [selectedEvent])

  const handleClick = useCallback((e: any) => {
    if (clickLockRef.current) return
    clickLockRef.current = true

    const clickLat = e?.lat ?? 0
    const clickLng = e?.lng ?? 0

    if (mode === 'events' || mode === 'similarity' || mode === 'agent') {
      let nearestEvent: GeoEvent | null = null
      let minDist = Infinity
      const sourceEvents = [...events, ...historicalEvents]
      for (const evt of sourceEvents) {
        const dist = haversineDistance(clickLat, clickLng, evt.lat, evt.lng)
        if (dist < minDist && dist < 1500) {
          minDist = dist
          nearestEvent = evt
        }
      }
      if (nearestEvent && onEventClick) {
        onEventClick(nearestEvent)
        clickLockRef.current = false
        return
      }
    }

    if (mode === 'supplyChain') {
      const nearest = findNearestCountry(clickLat, clickLng)
      if (nearest) {
        const path = supplyChainPaths.find(p =>
          p.links.some(l => l.fromCountry === nearest.code || l.toCountry === nearest.code)
        )
        if (path && onSupplyChainClick) {
          onSupplyChainClick(path)
          clickLockRef.current = false
          return
        }
      }
    }

    const country = findNearestCountry(clickLat, clickLng)
    if (!country) {
      clickLockRef.current = false
      return
    }

    onCountryClick(country)
    if (globeRef.current) {
      globeRef.current.focusCountry(country.lat, country.lng)
    }

    if (mapTimerRef.current) clearTimeout(mapTimerRef.current)
    mapTimerRef.current = setTimeout(() => {
      onOpenMap()
      clickLockRef.current = false
    }, 800)
  }, [mode, onEventClick, onSupplyChainClick, onCountryClick, onOpenMap])

  const financialHubs = [
    { lat: 40.7128, lng: -74.006, name: 'New York', weight: 1 },
    { lat: 51.5074, lng: -0.1278, name: 'London', weight: 1 },
    { lat: 35.6762, lng: 139.6503, name: 'Tokyo', weight: 0.9 },
    { lat: 31.2304, lng: 121.4737, name: 'Shanghai', weight: 0.9 },
    { lat: 22.3193, lng: 114.1694, name: 'Hong Kong', weight: 0.8 },
    { lat: 1.3521, lng: 103.8198, name: 'Singapore', weight: 0.7 },
    { lat: 48.8566, lng: 2.3522, name: 'Paris', weight: 0.6 },
    { lat: 25.2048, lng: 55.2708, name: 'Dubai', weight: 0.6 },
    { lat: 19.076, lng: 72.8777, name: 'Mumbai', weight: 0.6 },
    { lat: 55.7558, lng: 37.6173, name: 'Moscow', weight: 0.5 },
    { lat: -33.8688, lng: 151.2093, name: 'Sydney', weight: 0.5 },
    { lat: 37.5665, lng: 126.978, name: 'Seoul', weight: 0.5 },
    { lat: 52.52, lng: 13.405, name: 'Berlin', weight: 0.4 },
    { lat: -23.5505, lng: -46.6333, name: 'Sao Paulo', weight: 0.4 },
  ]

  const buildArcs = useCallback(() => {
    const arcs: any[] = []

    if (mode === 'default') {
      arcs.push(...tradeRoutes.map(r => ({
        startLat: r.fromLat, startLng: r.fromLng,
        endLat: r.toLat, endLng: r.toLng,
        color: r.color,
        stroke: 0.6,
        dashLength: 0.25,
        dashGap: 0.1,
        dashAnimateTime: 3000,
      })))
      arcs.push(...militaryRelations.map(r => ({
        startLat: r.fromLat, startLng: r.fromLng,
        endLat: r.toLat, endLng: r.toLng,
        color: r.type === 'alliance' ? '#44ff88' : r.type === 'rivalry' ? '#ff4444' : '#ffaa00',
        stroke: 0.4,
        dashLength: 0.2,
        dashGap: 0.15,
        dashAnimateTime: 4000,
      })))
    }

    if (mode === 'graph' || mode === 'similarity') {
      let edges: GraphEdge[] = []
      if (mode === 'similarity' && selectedEvent) {
        const code = selectedEvent.countryCode
        edges = defaultGraph.edges.filter(e => e.source === code || e.target === code)
      } else {
        edges = defaultGraph.edges.slice(0, 20)
      }
      for (const e of edges) {
        const source = defaultGraph.nodes.find(n => n.id === e.source)
        const target = defaultGraph.nodes.find(n => n.id === e.target)
        if (!source || !target) continue
        const slat = source.lat; const slng = source.lng
        const tlat = target.lat; const tlng = target.lng
        if (slat === undefined || slng === undefined || tlat === undefined || tlng === undefined) continue
        arcs.push({
          startLat: slat, startLng: slng,
          endLat: tlat, endLng: tlng,
          color: e.type === 'affects' ? '#ff8800' :
                 e.type === 'produces' ? '#22c55e' :
                 e.type === 'depends_on' ? '#3b82f6' :
                 e.type === 'impacts' ? '#ef4444' : '#a855f7',
          stroke: 0.3 + e.weight * 0.3,
        })
      }
    }

    if (mode === 'supplyChain') {
      const links = getAllSupplyChainLinks()
      for (const l of links) {
        arcs.push({
          startLat: l.fromLat, startLng: l.fromLng,
          endLat: l.toLat, endLng: l.toLng,
          color: l.color,
          dashLength: l.dashLength,
          dashGap: l.dashGap,
          dashAnimateTime: l.animateTime,
          stroke: Math.max(0.5, l.criticality * 0.15),
        })
      }
    }

    if (mode === 'risk') {
      for (const r of tradeRoutes.slice(0, 15)) {
        arcs.push({
          startLat: r.fromLat, startLng: r.fromLng,
          endLat: r.toLat, endLng: r.toLng,
          color: '#ef4444',
          dashLength: 0.4,
          dashGap: 0.1,
          dashAnimateTime: 1500,
          stroke: 1.5,
        })
      }
    }

    if (mode === 'similarity' && selectedEvent) {
      const similar = getSimilarEvents(selectedEvent)
      for (const s of similar) {
        arcs.push({
          startLat: selectedEvent.lat, startLng: selectedEvent.lng,
          endLat: s.lat, endLng: s.lng,
          color: '#a855f780',
          dashLength: 0.2,
          dashGap: 0.3,
          dashAnimateTime: 4000,
          stroke: 0.3,
        })
      }
    }

    if (mode === 'events' || mode === 'similarity') {
      const processed = new Set<string>()
      for (const evt of events) {
        const similar = getSimilarEvents(evt)
        for (const sim of similar) {
          const key = [evt.id, sim.id].sort().join('-')
          if (processed.has(key)) continue
          processed.add(key)
          arcs.push({
            startLat: sim.lat, startLng: sim.lng,
            endLat: evt.lat, endLng: evt.lng,
            color: sim.isHistorical ? '#a855f760' : '#3b82f660',
            dashLength: 0.15,
            dashGap: 0.25,
            dashAnimateTime: 5000,
            stroke: sim.isHistorical ? 0.25 : 0.4,
          })
        }
      }
    }

    if (selectedCountry && mode === 'default') {
      const relatedTrade = tradeRoutes.filter(
        r => r.from === selectedCountry.code || r.to === selectedCountry.code
      )
      const relatedMilitary = militaryRelations.filter(
        r => r.countryA === selectedCountry.code || r.countryB === selectedCountry.code
      )
      arcs.splice(0, arcs.length)
      for (const r of relatedTrade) {
        arcs.push({
          startLat: r.fromLat, startLng: r.fromLng,
          endLat: r.toLat, endLng: r.toLng,
          color: r.color,
        })
      }
      for (const r of relatedMilitary) {
        arcs.push({
          startLat: r.fromLat, startLng: r.fromLng,
          endLat: r.toLat, endLng: r.toLng,
          color: r.type === 'alliance' ? '#44ff88' : r.type === 'rivalry' ? '#ff4444' : '#ffaa00',
        })
      }
    }

    return arcs
  }, [mode, agentMode, selectedEvent, selectedCountry])

  const buildNodes = useCallback(() => {
    const nodes: any[] = []

    if (mode === 'default' && activeLayers.ports) {
      for (const p of portLocations) {
        nodes.push({
          lat: p.lat,
          lng: p.lng,
          radius: p.volume === 'major' ? 0.08 : 0.05,
          color: p.volume === 'major' ? '#00ffdd' : '#00d4ff',
          pulseColor: p.volume === 'major' ? '#00ffdd' : '#00d4ff',
        })
      }
    }

    if (mode === 'default') {
      for (const h of financialHubs) {
        nodes.push({
          lat: h.lat,
          lng: h.lng,
          radius: 0.04 * h.weight,
          color: h.weight >= 0.8 ? '#c084fc' : h.weight >= 0.6 ? '#67e8f9' : '#a78bfa',
          pulseColor: h.weight >= 0.8 ? '#c084fc' : '#67e8f9',
        })
      }
    }

    if (mode === 'events' || mode === 'similarity' || mode === 'agent') {
      let sourceEvents = [...events]
      if (mode === 'agent') {
        const mapping: Record<string, string[]> = {
          conflict: ['conflict', 'military'],
          energy: ['economic'],
          supplyChain: ['economic'],
          market: ['market', 'economic'],
        }
        const allowed = mapping[agentMode] || []
        sourceEvents = events.filter(e => allowed.includes(e.type))
      }
      if (mode === 'similarity' && selectedEvent) {
        sourceEvents = [...getSimilarEvents(selectedEvent)]
      }
      for (const e of sourceEvents) {
        nodes.push({
          lat: e.lat,
          lng: e.lng,
          radius: Math.max(0.04, e.severity * 0.012),
          color: e.sentiment === 'positive' ? '#22c55e' :
                 e.sentiment === 'negative' ? '#ef4444' : '#eab308',
          pulseColor: e.sentiment === 'positive' ? '#22c55e' :
                      e.sentiment === 'negative' ? '#ef4444' : '#eab308',
          pulseSpeed: 0.5 + e.severity * 0.2,
        })
      }
    }

    if (mode === 'supplyChain' && activeLayers.supplyLabels !== false) {
      const nodeCountries = getSupplyChainCountries()
      for (const code of nodeCountries) {
        const c = countries.find(cc => cc.code === code)
        if (!c) continue
        nodes.push({
          lat: c.lat,
          lng: c.lng,
          radius: selectedCountry?.code === code ? 0.1 : 0.06,
          color: selectedCountry?.code === code ? '#ffaa00' : '#f59e0b',
          pulseColor: '#f59e0b',
        })
      }
    }

    if (mode === 'worldState' || mode === 'forecast') {
      const source = liveWorldState && liveWorldState.length > 0
        ? liveWorldState
        : worldStates
      for (const ws of source as any[]) {
        const code = ws.code || nameToCode(ws.name || ws.id)
        const score = ws.risk_score !== undefined ? ws.risk_score * 100 : ws.riskScore
        const latlng = countries.find(c => c.code === code)
        if (!latlng) continue
        const riskColor = getRiskColor(score)
        nodes.push({
          lat: latlng.lat,
          lng: latlng.lng,
          radius: Math.max(0.06, (score || 35) * 0.0015),
          color: riskColor,
          pulseColor: riskColor,
        })
      }
    }

    return nodes
  }, [mode, agentMode, selectedEvent, activeLayers, selectedCountry, liveWorldState, forecastDay])

  const buildLabels = useCallback(() => {
    if (!activeLayers.labels) return []
    return countries.map(c => ({
      lat: c.lat,
      lng: c.lng,
      text: c.code,
      size: selectedCountry?.code === c.code ? 0.25 : 0.15,
      color: selectedCountry?.code === c.code ? '#ffaa00' : 'rgba(255,255,255,0.85)',
    }))
  }, [selectedCountry, activeLayers])

  const buildHeatmap = useCallback(() => {
    if (mode !== 'worldState' && mode !== 'forecast' && mode !== 'risk') return []

    let data = mode === 'forecast'
      ? worldStates.map(ws => {
          const fc = getForecastAtDay(ws.code, forecastDay)
          return { ...ws, riskScore: fc?.riskScore ?? ws.riskScore }
        })
      : liveWorldState && liveWorldState.length > 0
        ? liveWorldState.map((ws: any) => ({
            code: ws.code || nameToCode(ws.name || ws.id),
            riskScore: ws.risk_score !== undefined ? ws.risk_score * 100 : ws.riskScore,
          }))
        : worldStates

    return (data as any[]).map((ws: any) => {
      const code = ws.code
      const score = ws.riskScore
      const latlng = countries.find(c => c.code === code)
      if (!latlng) return null
      return {
        lat: latlng.lat,
        lng: latlng.lng,
        intensity: Math.min(1, (score || 35) / 100),
        color: getRiskColor(score),
      }
    }).filter(Boolean)
  }, [mode, liveWorldState, forecastDay])

  const buildRiskPaths = useCallback(() => {
    if (mode !== 'risk') return []
    return tradeRoutes.slice(0, 10).map(r => ({
      startLat: r.fromLat,
      startLng: r.fromLng,
      endLat: r.toLat,
      endLng: r.toLng,
      intensity: 0.8,
      color: '#ff4444',
    }))
  }, [mode])

  const buildHistoricalEvents = useCallback(() => {
    if (mode !== 'similarity') return []
    return historicalEvents.map(e => ({
      lat: e.lat,
      lng: e.lng,
      year: parseInt(e.timestamp.substring(0, 4)) || 2020,
      title: e.title,
      severity: e.severity,
      color: e.sentiment === 'negative' ? '#ef4444' : '#a855f7',
      isActive: selectedEvent?.relatedEvents.includes(e.id) || false,
    }))
  }, [mode, selectedEvent])

  const arcs = buildArcs()
  const nodes = buildNodes()
  const labels = buildLabels()
  const heatmap = buildHeatmap()
  const riskPaths = buildRiskPaths()
  const historicalEventsData = buildHistoricalEvents()

  return (
    <div
      ref={containerRef}
      className="globe-container w-full h-full relative"
      onClick={(e) => {
        const target = e.target as HTMLElement
        if (target.closest('canvas')) {
          handleClick({ lat: 0, lng: 0 })
        }
      }}
    >
      <GlobeScene
        ref={globeRef}
        arcsData={arcs}
        nodesData={nodes}
        labelsData={labels}
        heatmapData={heatmap}
        riskPaths={riskPaths}
        historicalEvents={historicalEventsData}
        showHologram={true}
        showAtmosphere={true}
        showGrid={true}
        showRings={true}
        showSatellites={true}
        showStars={true}
      />
    </div>
  )
}

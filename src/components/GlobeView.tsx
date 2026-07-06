import { useEffect, useRef, useState, useCallback } from 'react'
import createGlobe from 'globe.gl'
import { countries, type Country } from '../data/countries'
import { tradeRoutes, militaryRelations, portLocations, getCountryCoord } from '../data/relations'
import { haversineDistance } from '../utils/geo'
import { events, historicalEvents, getSimilarEvents } from '../data/events'
import type { GeoEvent } from '../data/events'
import { defaultGraph } from '../data/graphData'
import type { GraphEdge } from '../data/graphData'
import { getAllSupplyChainLinks, supplyChainPaths, getSupplyChainCountries } from '../data/supplyChains'
import type { SupplyChainLink, SupplyChainPath } from '../data/supplyChains'
import { worldStates, getRiskColor } from '../data/worldState'
import { forecasts, getForecastAtDay } from '../data/forecasts'
import type { LiveCountryState, DashboardData } from '../hooks/useWorldState'
import { riskScoreToColor, countryNameToCode as nameToCode } from '../hooks/useWorldState'
import type { GlobeMode, AgentMode } from './GlobeControls'

const Globe = createGlobe as unknown as (...args: unknown[]) => any

const cityData = [
  { lat: 31.2304, lng: 121.4737, value: 24.5, country: 'Shanghai' },
  { lat: 23.1291, lng: 113.2644, value: 18.0, country: 'Guangzhou' },
  { lat: 39.9042, lng: 116.4074, value: 21.5, country: 'Beijing' },
  { lat: 22.5431, lng: 114.0579, value: 15.3, country: 'Shenzhen' },
  { lat: 19.076, lng: 72.8777, value: 20.0, country: 'Mumbai' },
  { lat: 28.6139, lng: 77.209, value: 19.5, country: 'Delhi' },
  { lat: 13.0827, lng: 80.2707, value: 11.0, country: 'Chennai' },
  { lat: 22.5726, lng: 88.3639, value: 14.5, country: 'Kolkata' },
  { lat: 12.9716, lng: 77.5946, value: 12.0, country: 'Bangalore' },
  { lat: 40.7128, lng: -74.006, value: 18.8, country: 'New York' },
  { lat: 34.0522, lng: -118.2437, value: 12.5, country: 'Los Angeles' },
  { lat: 41.8781, lng: -87.6298, value: 9.5, country: 'Chicago' },
  { lat: 29.7604, lng: -95.3698, value: 7.0, country: 'Houston' },
  { lat: 33.4484, lng: -112.074, value: 5.0, country: 'Phoenix' },
  { lat: 37.7749, lng: -122.4194, value: 8.5, country: 'San Francisco' },
  { lat: 35.6762, lng: 139.6503, value: 13.9, country: 'Tokyo' },
  { lat: 34.6937, lng: 135.5023, value: 19.0, country: 'Osaka' },
  { lat: 35.1796, lng: 136.9067, value: 8.0, country: 'Nagoya' },
  { lat: 37.5665, lng: 126.978, value: 9.5, country: 'Seoul' },
  { lat: 22.3193, lng: 114.1694, value: 7.5, country: 'Hong Kong' },
  { lat: 1.3521, lng: 103.8198, value: 5.5, country: 'Singapore' },
  { lat: 3.139, lng: 101.6869, value: 7.0, country: 'Kuala Lumpur' },
  { lat: -6.2088, lng: 106.8456, value: 10.5, country: 'Jakarta' },
  { lat: 14.5995, lng: 120.9842, value: 13.0, country: 'Manila' },
  { lat: 13.7563, lng: 100.5018, value: 10.0, country: 'Bangkok' },
  { lat: 21.0278, lng: 105.8342, value: 8.0, country: 'Hanoi' },
  { lat: 10.8231, lng: 106.6297, value: 9.0, country: 'Ho Chi Minh' },
  { lat: 48.8566, lng: 2.3522, value: 11.0, country: 'Paris' },
  { lat: 51.5074, lng: -0.1278, value: 14.0, country: 'London' },
  { lat: 52.52, lng: 13.405, value: 6.0, country: 'Berlin' },
  { lat: 41.9028, lng: 12.4964, value: 4.3, country: 'Rome' },
  { lat: 40.4168, lng: -3.7038, value: 6.5, country: 'Madrid' },
  { lat: 55.7558, lng: 37.6173, value: 12.5, country: 'Moscow' },
  { lat: 59.9343, lng: 30.3351, value: 5.4, country: 'St Petersburg' },
  { lat: 52.2298, lng: 21.0122, value: 1.8, country: 'Warsaw' },
  { lat: -33.8688, lng: 151.2093, value: 5.2, country: 'Sydney' },
  { lat: -37.8136, lng: 144.9631, value: 5.0, country: 'Melbourne' },
  { lat: -23.5505, lng: -46.6333, value: 12.2, country: 'Sao Paulo' },
  { lat: -22.9068, lng: -43.1729, value: 6.5, country: 'Rio de Janeiro' },
  { lat: -15.8267, lng: -47.9218, value: 4.5, country: 'Brasilia' },
  { lat: -34.6037, lng: -58.3816, value: 15.0, country: 'Buenos Aires' },
  { lat: -33.4691, lng: -70.642, value: 7.0, country: 'Santiago' },
  { lat: 19.4326, lng: -99.1332, value: 21.5, country: 'Mexico City' },
  { lat: 10.4806, lng: -66.9036, value: 3.0, country: 'Caracas' },
  { lat: 6.5244, lng: 3.3792, value: 14.0, country: 'Lagos' },
  { lat: 30.0444, lng: 31.2357, value: 9.0, country: 'Cairo' },
  { lat: -25.7461, lng: 28.1881, value: 4.5, country: 'Pretoria' },
  { lat: -33.9249, lng: 18.4241, value: 4.0, country: 'Cape Town' },
  { lat: -1.2864, lng: 36.8172, value: 5.0, country: 'Nairobi' },
  { lat: 9.032, lng: 38.7469, value: 5.0, country: 'Addis Ababa' },
  { lat: 34.0076, lng: 71.5781, value: 4.0, country: 'Islamabad' },
  { lat: 25.2048, lng: 55.2708, value: 3.0, country: 'Dubai' },
  { lat: 24.7136, lng: 46.6753, value: 7.5, country: 'Riyadh' },
  { lat: 35.6892, lng: 51.389, value: 9.0, country: 'Tehran' },
  { lat: 41.0082, lng: 28.9784, value: 15.5, country: 'Istanbul' },
  { lat: -7.2575, lng: 112.7521, value: 5.0, country: 'Surabaya' },
  { lat: 23.0225, lng: 72.5714, value: 8.0, country: 'Ahmedabad' },
  { lat: 17.385, lng: 78.4867, value: 8.5, country: 'Hyderabad' },
  { lat: -8.3405, lng: 115.092, value: 1.5, country: 'Denpasar' },
  { lat: 38.9072, lng: -77.0369, value: 6.0, country: 'Washington DC' },
]

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

const typeIcons: Record<string, string> = {
  conflict: '⚔️', economic: '📊', diplomatic: '🤝',
  natural: '🌊', market: '💹', military: '🔴',
}

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

function findNearestEvent(lat: number, lng: number): GeoEvent | null {
  let nearest: GeoEvent | null = null
  let minDist = Infinity
  for (const e of [...events, ...historicalEvents]) {
    const dist = haversineDistance(lat, lng, e.lat, e.lng)
    if (dist < minDist && dist < 1500) {
      minDist = dist
      nearest = e
    }
  }
  return nearest
}

export default function GlobeView({
  selectedCountry, onCountryClick, onOpenMap,
  mode, agentMode, forecastDay, selectedEvent, onEventClick,
  activeLayers, onSupplyChainClick, liveWorldState,
}: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<any>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const mapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clickLockRef = useRef(false)
  const pulseRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current
        setDimensions({ width: clientWidth, height: clientHeight })
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const buildCountryLabels = useCallback(() => {
    if (!activeLayers.labels) return []
    return countries.map(c => ({
      lat: c.lat,
      lng: c.lng,
      label: c.code,
      size: selectedCountry?.code === c.code ? 0.8 : 0.5,
      color: selectedCountry?.code === c.code ? '#ffaa00' : 'rgba(255,255,255,0.85)',
      country: c,
    }))
  }, [selectedCountry, activeLayers])

  const buildPortPoints = useCallback(() => {
    if (!activeLayers.ports) return []
    return portLocations.map(p => ({
      lat: p.lat,
      lng: p.lng,
      name: p.name,
      radius: p.volume === 'major' ? 0.5 : 0.35,
      color: p.volume === 'major' ? '#00ffdd' : '#00d4ff',
      altitude: 0.04,
    }))
  }, [activeLayers])

  const getEventPoints = useCallback(() => {
    if (mode !== 'events' && mode !== 'similarity' && mode !== 'agent') return []

    let sourceEvents = [...events]
    if (mode === 'agent') {
      const agentMapping: Record<string, string[]> = {
        conflict: ['conflict', 'military'],
        energy: ['economic'],
        supplyChain: ['economic'],
        market: ['market', 'economic'],
      }
      const allowedTypes = agentMapping[agentMode] || []
      sourceEvents = events.filter(e => allowedTypes.includes(e.type))
    }
    if (mode === 'similarity' && selectedEvent) {
      const similar = getSimilarEvents(selectedEvent)
      sourceEvents = [...similar]
    }

    return sourceEvents.map(e => ({
      lat: e.lat,
      lng: e.lng,
      radius: Math.max(0.3, e.severity * 0.08),
      color: e.sentiment === 'positive' ? '#22c55e' :
             e.sentiment === 'negative' ? '#ef4444' : '#eab308',
      name: e.title,
      event: e,
      altitude: 0.02,
    }))
  }, [mode, agentMode, selectedEvent])

  const getEventRings = useCallback(() => {
    if (mode === 'default') {
      return financialHubs.map(h => ({
        lat: h.lat,
        lng: h.lng,
        radius: 0.8 * h.weight,
        color: h.weight >= 0.8 ? '#7b2ff780' :
               h.weight >= 0.6 ? '#00d4ff60' : '#7b2ff750',
        altitude: 0.005,
      }))
    }
    if (mode !== 'events' && mode !== 'similarity' && mode !== 'agent') return []

    let sourceEvents = [...events]
    if (mode === 'agent') {
      const agentMapping: Record<string, string[]> = {
        conflict: ['conflict', 'military'],
        energy: ['economic'],
        supplyChain: ['economic'],
        market: ['market', 'economic'],
      }
      const allowedTypes = agentMapping[agentMode] || []
      sourceEvents = events.filter(e => allowedTypes.includes(e.type))
    }
    if (mode === 'similarity' && selectedEvent) {
      const similar = getSimilarEvents(selectedEvent)
      sourceEvents = [...similar]
    }

    return sourceEvents.filter(e => e.sentiment === 'negative' || e.severity >= 6).map(e => ({
      lat: e.lat,
      lng: e.lng,
      radius: e.severity * 0.5,
      color: e.severity >= 7 ? '#ef444480' :
             e.severity >= 5 ? '#f9731680' : '#eab30880',
      altitude: 0.01,
    }))
  }, [mode, agentMode, selectedEvent])

  const getGraphArcs = useCallback(() => {
    if (mode !== 'graph' && mode !== 'similarity') return []

    let edges: GraphEdge[] = defaultGraph.edges.slice(0, 20)

    if (mode === 'similarity' && selectedEvent) {
      const countryCode = selectedEvent.countryCode
      edges = defaultGraph.edges.filter(
        e => e.source === countryCode || e.target === countryCode
      )
    }

    return edges.map(e => {
      const source = defaultGraph.nodes.find(n => n.id === e.source)
      const target = defaultGraph.nodes.find(n => n.id === e.target)
      if (!source || !target) return null
      const sourceLat = source.lat ?? getCountryCoord(source.id)?.lat
      const sourceLng = source.lng ?? getCountryCoord(source.id)?.lng
      const targetLat = target.lat ?? getCountryCoord(target.id)?.lat
      const targetLng = target.lng ?? getCountryCoord(target.id)?.lng
      if (sourceLat === undefined || sourceLng === undefined ||
          targetLat === undefined || targetLng === undefined) return null
      return {
        startLat: sourceLat,
        startLng: sourceLng,
        endLat: targetLat,
        endLng: targetLng,
        color: e.type === 'affects' ? '#ff8800' :
               e.type === 'produces' ? '#22c55e' :
               e.type === 'depends_on' ? '#3b82f6' :
               e.type === 'impacts' ? '#ef4444' : '#a855f7',
        label: e.label,
        weight: e.weight,
      }
    }).filter(Boolean)
  }, [mode, selectedEvent])

  const getSupplyChainArcs = useCallback(() => {
    if (mode !== 'supplyChain') return []

    const links = getAllSupplyChainLinks()
    return links.map(l => ({
      startLat: l.fromLat,
      startLng: l.fromLng,
      endLat: l.toLat,
      endLng: l.toLng,
      color: l.color,
      dashLength: l.dashLength,
      dashGap: l.dashGap,
      dashAnimateTime: l.animateTime,
      stroke: Math.max(0.5, l.criticality * 0.15),
      label: `${l.commodity} — ${l.volume} — Criticality: ${l.criticality}/10`,
    }))
  }, [mode])

  const getRiskArcs = useCallback(() => {
    if (mode !== 'risk') return []
    return tradeRoutes.slice(0, 15).map(r => ({
      startLat: r.fromLat,
      startLng: r.fromLng,
      endLat: r.toLat,
      endLng: r.toLng,
      color: '#ef4444',
      dashLength: 0.4,
      dashGap: 0.1,
      dashAnimateTime: 1500,
      stroke: 1.5,
    }))
  }, [mode])

  const getWorldStatePoints = useCallback(() => {
    if (mode !== 'worldState') return []

    const source = liveWorldState && liveWorldState.length > 0 ? liveWorldState : worldStates

    return source.map((ws: any) => {
      const code = ws.code || nameToCode(ws.name || ws.id)
      const score = ws.risk_score !== undefined ? ws.risk_score * 100 : ws.riskScore
      const riskColor = ws.code ? getRiskColor(score) : riskScoreToColor(ws.risk_score ?? 0)
      const latlng = countries.find(c => c.code === code)
      return {
        lat: latlng?.lat ?? 0,
        lng: latlng?.lng ?? 0,
        radius: Math.max(0.4, (score || 35) * 0.01),
        color: riskColor,
        altitude: 0.01,
        name: ws.name,
        riskScore: score,
      }
    }).filter(p => p.lat !== 0 || p.lng !== 0)
  }, [mode, liveWorldState])

  const getForecastPoints = useCallback(() => {
    if (mode !== 'forecast') return []

    return worldStates.map(ws => {
      const fc = getForecastAtDay(ws.code, forecastDay)
      const risk = fc?.riskScore ?? ws.riskScore
      const riskColor = getRiskColor(risk)
      return {
        lat: countries.find(c => c.code === ws.code)?.lat ?? 0,
        lng: countries.find(c => c.code === ws.code)?.lng ?? 0,
        radius: Math.max(0.4, risk * 0.012),
        color: riskColor,
        altitude: 0.01,
        name: ws.name,
        riskScore: risk,
        forecastDay,
      }
    }).filter(p => p.lat !== 0 || p.lng !== 0)
  }, [mode, forecastDay])

  const getHubPoints = useCallback(() => {
    if (mode !== 'default') return []
    return financialHubs.map(h => ({
      lat: h.lat,
      lng: h.lng,
      radius: 0.15 * h.weight,
      color: h.weight >= 0.8 ? '#c084fc' :
             h.weight >= 0.6 ? '#67e8f9' : '#a78bfa',
      altitude: 0.03,
      name: h.name,
    }))
  }, [mode])

  const getHistoricalArcs = useCallback(() => {
    if (mode !== 'similarity' || !selectedEvent) return []

    const similar = getSimilarEvents(selectedEvent)
    return similar.map(s => ({
      startLat: selectedEvent.lat,
      startLng: selectedEvent.lng,
      endLat: s.lat,
      endLng: s.lng,
      color: '#a855f780',
      dashLength: 0.2,
      dashGap: 0.3,
      dashAnimateTime: 4000,
      stroke: 0.3,
    }))
  }, [mode, selectedEvent])

  const getSupplyChainNodePoints = useCallback(() => {
    if (mode !== 'supplyChain') return []
    if (activeLayers.supplyLabels === false) return []

    const nodeCountries = getSupplyChainCountries()

    return nodeCountries.map(code => {
      const c = countries.find(cc => cc.code === code)
      if (!c) return null
      const isSelected = selectedCountry?.code === code
      return {
        lat: c.lat,
        lng: c.lng,
        radius: isSelected ? 0.6 : 0.4,
        color: isSelected ? '#ffaa00' : '#f59e0b',
        altitude: isSelected ? 0.06 : 0.04,
        name: c.name,
        code: c.code,
        type: 'supplyChainNode' as const,
      }
    }).filter(Boolean)
  }, [mode, activeLayers, selectedCountry])

  const getEventEvolutionArcs = useCallback(() => {
    if (mode !== 'events' && mode !== 'similarity') return []

    const arcs: any[] = []
    const processed = new Set<string>()

    for (const evt of events) {
      const similar = getSimilarEvents(evt)
      for (const sim of similar) {
        const key = [evt.id, sim.id].sort().join('-')
        if (processed.has(key)) continue
        processed.add(key)
        arcs.push({
          startLat: sim.lat,
          startLng: sim.lng,
          endLat: evt.lat,
          endLng: evt.lng,
          color: sim.isHistorical ? '#a855f760' : '#3b82f660',
          dashLength: 0.15,
          dashGap: 0.25,
          dashAnimateTime: 5000,
          stroke: sim.isHistorical ? 0.25 : 0.4,
        })
      }
    }

    return arcs
  }, [mode])

  useEffect(() => {
    if (!containerRef.current) return

    const globe = Globe()
      .globeImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg')
      .bumpImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png')
      .backgroundImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/night-sky.png')
      .width(dimensions.width)
      .height(dimensions.height)
      .hexBinPointsData(cityData)
      .hexBinPointWeight('value')
      .hexBinResolution(4)
      .hexAltitude((d: any) => d.sumWeight * 5e-3)
      .hexTopColor((d: any) => {
        const t = Math.min(d.sumWeight / 22, 1)
        if (t < 0.2) return '#2d0066'
        if (t < 0.4) return '#0044aa'
        if (t < 0.6) return '#0088dd'
        if (t < 0.8) return '#44ddaa'
        return '#ffcc00'
      })
      .hexSideColor((d: any) => {
        const t = Math.min(d.sumWeight / 22, 1)
        if (t < 0.2) return '#1a0044'
        if (t < 0.4) return '#003377'
        if (t < 0.6) return '#0066aa'
        if (t < 0.8) return '#33bb88'
        return '#ddaa00'
      })
      .hexBinMerge(true)
      .hexLabel((d: any) => {
        const pts = d.points as Array<{ country: string; lat: number; lng: number; value?: number }>
        const topCities = pts
          .sort((a, b) => (b.value || 0) - (a.value || 0))
          .slice(0, 3)
          .map(p => `${p.country}: ${p.value}M`)
          .join('<br/>')
        return `<div style="background:rgba(0,0,0,0.85);color:white;padding:8px 12px;border-radius:8px;font-size:12px;line-height:1.4">
          <b>Population Cluster</b><br/>${topCities}
        </div>`
      })
      .labelsData([])
      .pointsData([])
      .arcsData([])
      .ringsData([])
      .atmosphereColor('#7b2ff7')
      .atmosphereAltitude(0.35)

    globe(containerRef.current)
    globeRef.current = globe

    globe.controls().autoRotate = true
    globe.controls().autoRotateSpeed = 0.6
    globe.controls().enableZoom = true

    globe.onGlobeClick(({ lat: clickLat, lng: clickLng }: { lat: number; lng: number }) => {
      if (clickLockRef.current) return
      clickLockRef.current = true

      if (mode === 'events' || mode === 'similarity' || mode === 'agent') {
        const event = findNearestEvent(clickLat, clickLng)
        if (event && onEventClick) {
          onEventClick(event)
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

      globe.controls().autoRotate = false
      globe.pointOfView({ lat: country.lat, lng: country.lng, altitude: 1.5 }, 1000)

      if (mapTimerRef.current) clearTimeout(mapTimerRef.current)
      mapTimerRef.current = setTimeout(() => {
        onOpenMap()
        clickLockRef.current = false
      }, 800)
    })

    return () => {
      if (mapTimerRef.current) clearTimeout(mapTimerRef.current)
      if (pulseRef.current) clearInterval(pulseRef.current)
      if (globeRef.current) {
        globeRef.current._destructor?.()
      }
    }
  }, [dimensions])

  useEffect(() => {
    const globe = globeRef.current
    if (!globe) return

    const shouldShowHex = mode === 'default' || mode === 'risk'

    if (!shouldShowHex && globe.hexBinPointsData) {
      globe.hexBinPointsData([])
    } else if (shouldShowHex && globe.hexBinPointsData) {
      globe.hexBinPointsData(cityData)
      globe.hexBinPointWeight('value')
    }

    globe.labelsData(buildCountryLabels())
    globe.labelLat('lat')
    globe.labelLng('lng')
    globe.labelText('label')
    globe.labelSize('size')
    globe.labelColor('color')
    globe.labelDotRadius(0.2)
    globe.labelDotOrientation('bottom')

    const worldPoints = [...getWorldStatePoints(), ...getForecastPoints()]
    if (worldPoints.length > 0) {
      globe.pointsData(worldPoints)
      globe.pointLat('lat')
      globe.pointLng('lng')
      globe.pointColor('color')
      globe.pointAltitude('altitude')
      globe.pointRadius('radius')
      globe.pointsMerge(true)
      globe.pointLabel((d: any) => {
        return `<div style="background:rgba(0,0,0,0.85);color:white;padding:6px 10px;border-radius:6px;font-size:11px">
          <b>${d.name}</b>${d.riskScore !== undefined ? `<br/>Risk: ${d.riskScore}/100` : ''}${d.forecastDay !== undefined ? `<br/>Forecast: +${d.forecastDay}d` : ''}
        </div>`
      })
    } else {
      const portPts = buildPortPoints()
      const eventPts = getEventPoints()
      const hubPts = getHubPoints()
      const supplyPts = getSupplyChainNodePoints()
      globe.pointsData([...portPts, ...eventPts, ...hubPts, ...supplyPts])
      globe.pointLat('lat')
      globe.pointLng('lng')
      globe.pointColor('color')
      globe.pointAltitude((d: any) => d.altitude || 0.05)
      globe.pointRadius((d: any) => d.radius || 0.25)
      globe.pointsMerge(true)
      globe.pointLabel((d: any) => {
        if (d.event) {
          const e = d.event as GeoEvent
          return `<div style="background:rgba(0,0,0,0.9);color:white;padding:8px 12px;border-radius:8px;font-size:11px;max-width:220px">
            <b>${typeIcons[e.type] || '📌'} ${e.title}</b><br/>
            <span style="color:#aaa">Severity: ${e.severity}/10 · ${e.type}</span><br/>
            <span style="color:#666;font-size:10px">${e.description.substring(0, 100)}...</span>
          </div>`
        }
        if (d.type === 'supplyChainNode') {
          return `<div style="background:rgba(0,0,0,0.9);color:white;padding:8px 12px;border-radius:8px;font-size:11px;border:1px solid #f59e0b">
            <b>🔗 ${d.name} (${d.code})</b><br/>
            <span style="color:#f59e0b;font-size:10px">Supply Chain Node — click to view paths</span>
          </div>`
        }
        if (d.name) {
          return `<div style="background:rgba(0,0,0,0.85);color:white;padding:6px 10px;border-radius:6px;font-size:11px">
            <b>${d.name}</b>
          </div>`
        }
        return ''
      })
    }

    const arcs: any[] = []
    if (mode === 'default' || mode === 'graph' || mode === 'similarity') {
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
      arcs.push(...getGraphArcs())
      arcs.push(...getHistoricalArcs())
    }
    arcs.push(...getSupplyChainArcs())
    arcs.push(...getRiskArcs())
    arcs.push(...getEventEvolutionArcs())

    if (selectedCountry && mode === 'default') {
      const relatedTrade = tradeRoutes.filter(
        r => r.from === selectedCountry.code || r.to === selectedCountry.code
      )
      const relatedMilitary = militaryRelations.filter(
        r => r.countryA === selectedCountry.code || r.countryB === selectedCountry.code
      )
      arcs.length = 0
      arcs.push(
        ...relatedTrade.map(r => ({
          startLat: r.fromLat, startLng: r.fromLng,
          endLat: r.toLat, endLng: r.toLng,
          color: r.color,
        })),
        ...relatedMilitary.map(r => ({
          startLat: r.fromLat, startLng: r.fromLng,
          endLat: r.toLat, endLng: r.toLng,
          color: r.type === 'alliance' ? '#44ff88' : r.type === 'rivalry' ? '#ff4444' : '#ffaa00',
        }))
      )
    }

    globe.arcsData(arcs)
    globe.arcColor('color')
    globe.arcStroke((d: any) => (d as any).stroke || 0.5)

    const hasCustomDash = arcs.some((a: any) => a.dashLength !== undefined)
    if (hasCustomDash) {
      globe.arcDashLength((d: any) => d.dashLength || 0.3)
      globe.arcDashGap((d: any) => d.dashGap || 0.15)
      globe.arcDashAnimateTime((d: any) => d.dashAnimateTime || 2500)
    } else {
      globe.arcDashLength(0.3)
      globe.arcDashGap(0.15)
      globe.arcDashAnimateTime(2500)
    }

    const rings = getEventRings()
    globe.ringsData(rings)
    globe.ringLat('lat')
    globe.ringLng('lng')
    globe.ringMaxRadius('radius')
    globe.ringColor('color')
    globe.ringAltitude('altitude')
    globe.ringPropagationSpeed(mode === 'default' ? 2 : 3)
    globe.ringRepeatPeriod(mode === 'default' ? 3000 : 2000)

    if (shouldShowHex) {
      globe.controls().autoRotate = true
      globe.controls().autoRotateSpeed = 0.6
    } else {
      globe.controls().autoRotate = false
    }
  }, [
    selectedCountry, mode, agentMode, forecastDay, selectedEvent,
    buildCountryLabels, buildPortPoints, getEventPoints, getEventRings,
    getGraphArcs, getSupplyChainArcs, getRiskArcs,
    getWorldStatePoints, getForecastPoints, getHistoricalArcs,
    getHubPoints, getSupplyChainNodePoints, getEventEvolutionArcs, activeLayers,
  ])

  return (
    <div ref={containerRef} className="globe-container w-full h-full relative" />
  )
}


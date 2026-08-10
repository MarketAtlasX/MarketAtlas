import { memo, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip } from 'react-leaflet'
import type { Country } from '../data/countries'
import { countries as allCountries } from '../data/countries'
import type { TradeRoute, PortData } from '../data/relations'
import { bearing, destinationPoint, getZoomLevel } from '../utils/geo'
import { useTheme } from '../context/ThemeContext'
import 'leaflet/dist/leaflet.css'

interface CountryMapProps {
  country: Country
  tradeRoutes: TradeRoute[]
  ports: PortData[]
}

export default memo(function CountryMap({ country, tradeRoutes, ports }: CountryMapProps) {
  const { theme } = useTheme()
  const zoomLevel = useMemo(() => getZoomLevel(country.code), [country])

  const tradeArcs = useMemo(() => {
    return tradeRoutes.map(r => {
      const partnerCode = r.from === country.code ? r.to : r.from
      const partner = allCountries.find(c => c.code === partnerCode)
      if (!partner) return null
      const b = bearing(country.lat, country.lng, partner.lat, partner.lng)
      const mid1 = destinationPoint(country.lat, country.lng, b, 150)
      const mid2 = destinationPoint(country.lat, country.lng, b, 350)
      const end = destinationPoint(country.lat, country.lng, b, 500)
      return {
        positions: [
          [country.lat, country.lng] as [number, number],
          [mid1.lat, mid1.lng] as [number, number],
          [mid2.lat, mid2.lng] as [number, number],
          [end.lat, end.lng] as [number, number],
        ],
        partner: partnerCode,
        value: r.value,
        color: r.color,
        direction: r.from === country.code ? 'Export' : 'Import',
      }
    }).filter(Boolean)
  }, [tradeRoutes, country])

  const tradePartners = useMemo(() => {
    const set = new Set<string>()
    for (const r of tradeRoutes) {
      set.add(r.from === country.code ? r.to : r.from)
    }
    return [...set]
  }, [tradeRoutes, country])

  return (
    <MapContainer
      center={[country.lat, country.lng]}
      zoom={zoomLevel}
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url={theme === 'dark'
          ? 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png'
          : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        }
      />

      {tradeArcs.map((arc, i) => (
        arc && (
          <Polyline
            key={`trade-${i}`}
            positions={arc.positions}
            pathOptions={{
              color: arc.color,
              weight: 2,
              opacity: 0.7,
              dashArray: '8 6',
            }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <span className="text-xs">
                {arc.direction} → {arc.partner}: {arc.value}
              </span>
            </Tooltip>
          </Polyline>
        )
      ))}

      {ports.map((p, i) => (
        <CircleMarker
          key={`port-${i}`}
          center={[p.lat, p.lng]}
          radius={p.volume === 'major' ? 8 : p.volume === 'medium' ? 6 : 4}
          pathOptions={{
            color: p.volume === 'major' ? '#3b82f6' : p.volume === 'medium' ? '#60a5fa' : '#93c5fd',
            fillColor: p.volume === 'major' ? '#2563eb' : p.volume === 'medium' ? '#3b82f6' : '#60a5fa',
            fillOpacity: 0.8,
            weight: 2,
          }}
        >
          <Tooltip direction="top">
            <div className="text-xs">
              <span className="font-semibold">{p.name}</span>
              <span className="ml-1 text-[10px] opacity-70">{p.volume.toUpperCase()} PORT</span>
            </div>
          </Tooltip>
        </CircleMarker>
      ))}

      {tradePartners.map(partnerCode => {
        const partner = allCountries.find(c => c.code === partnerCode)
        if (!partner) return null
        return (
          <CircleMarker
            key={`partner-${partnerCode}`}
            center={[partner.lat, partner.lng]}
            radius={5}
            pathOptions={{
              color: '#06b6d4',
              fillColor: '#06b6d4',
              fillOpacity: 0.6,
              weight: 1.5,
            }}
          >
            <Tooltip direction="top">
              <span className="text-xs">{partner.name} ({partnerCode})</span>
            </Tooltip>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
})

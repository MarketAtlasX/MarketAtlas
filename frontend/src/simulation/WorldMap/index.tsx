import { useMemo } from 'react'
import { Globe } from 'lucide-react'
import type { InjectedEvent } from '../types'

interface WorldMapProps {
  events: InjectedEvent[]
  riskScores?: Record<string, number>
}

const COUNTRY_COLORS = [
  { min: 0.7, color: 'bg-red-600', label: 'High Risk' },
  { min: 0.4, color: 'bg-yellow-600', label: 'Medium Risk' },
  { min: 0, color: 'bg-green-600', label: 'Low Risk' },
]

export default function WorldMap({ events, riskScores }: WorldMapProps) {
  const affectedCountries = useMemo(() => {
    const countryMap: Record<string, { events: string[]; maxSeverity: number }> = {}
    events.forEach(event => {
      event.countries.forEach(country => {
        if (!countryMap[country]) {
          countryMap[country] = { events: [], maxSeverity: 0 }
        }
        countryMap[country].events.push(event.title)
        countryMap[country].maxSeverity = Math.max(countryMap[country].maxSeverity, event.severity)
      })
    })
    return Object.entries(countryMap).sort(([, a], [, b]) => b.maxSeverity - a.maxSeverity)
  }, [events])

  const getCountryColor = (severity: number) => {
    const match = COUNTRY_COLORS.find(c => severity >= c.min)
    return match?.color || 'bg-gray-600'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Globe className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-white">Geographic Impact</h3>
      </div>

      <div className="bg-gray-900 rounded-lg p-6 flex items-center justify-center min-h-[200px]">
        {affectedCountries.length === 0 ? (
          <p className="text-gray-500 text-sm">No countries affected in current scenario.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full">
            {affectedCountries.map(([country, data]) => (
              <div
                key={country}
                className={`rounded-lg p-3 border border-gray-700 ${getCountryColor(data.maxSeverity)} bg-opacity-20`}
              >
                <span className="text-sm text-white font-medium block">{country}</span>
                <span className="text-xs text-gray-400 block mt-1">
                  {data.events.length} event{data.events.length > 1 ? 's' : ''}
                </span>
                <div className="mt-2 w-full bg-gray-800 rounded-full h-1">
                  <div
                    className="h-1 rounded-full bg-red-500"
                    style={{ width: `${data.maxSeverity * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {riskScores && Object.keys(riskScores).length > 0 && (
        <div className="bg-gray-900 rounded-lg p-4">
          <span className="text-sm text-gray-400 font-medium mb-2 block">Risk Scores</span>
          <div className="space-y-2">
            {Object.entries(riskScores).slice(0, 8).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{key.replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-800 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        value > 0.6 ? 'bg-red-500' : value > 0.3 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, value * 100)}%` }}
                    />
                  </div>
                  <span className="text-gray-500 w-8 text-right">{(value * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

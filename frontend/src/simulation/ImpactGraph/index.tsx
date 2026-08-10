import { useMemo, useState } from 'react'
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { ImpactMetric } from '../types'

interface ImpactGraphProps {
  impacts: ImpactMetric[]
  title?: string
}

export default function ImpactGraph({ impacts, title = 'Market Impact' }: ImpactGraphProps) {
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'confidence'>('value')

  const sorted = useMemo(() => {
    return [...impacts].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'confidence') return b.confidence - a.confidence
      return Math.abs(b.value) - Math.abs(a.value)
    })
  }, [impacts, sortBy])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <select
          className="text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-300"
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
        >
          <option value="value">Sort by Impact</option>
          <option value="confidence">Sort by Confidence</option>
          <option value="name">Sort by Name</option>
        </select>
      </div>

      <div className="space-y-2">
        {sorted.map((impact, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {impact.direction === 'up' ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : impact.direction === 'down' ? (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                ) : (
                  <Minus className="w-4 h-4 text-gray-500" />
                )}
                <span className="text-sm text-white">{impact.name.replace(/_/g, ' ')}</span>
              </div>
              <span className={`text-sm font-mono ${
                impact.value > 0 ? 'text-green-400' : impact.value < 0 ? 'text-red-400' : 'text-gray-400'
              }`}>
                {impact.value > 0 ? '+' : ''}{impact.value.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Confidence: {(impact.confidence * 100).toFixed(0)}%
              </span>
              <span className="flex-1 truncate">{impact.reasoning}</span>
            </div>

            <div className="mt-2 w-full bg-gray-800 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  impact.direction === 'up' ? 'bg-green-500' :
                  impact.direction === 'down' ? 'bg-red-500' : 'bg-gray-500'
                }`}
                style={{ width: `${Math.abs(impact.value) * 200}%`, maxWidth: '100%' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

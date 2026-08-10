import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'
import type { EventImpact } from '../api/liveEventsApi'

interface EventImpactBreakdownProps {
  impacts: EventImpact[]
}

const directionIcon = (dir: string) => {
  switch (dir) {
    case 'positive': return <TrendingUp size={12} className="text-green-400" />
    case 'negative': return <TrendingDown size={12} className="text-red-400" />
    case 'mixed': return <Minus size={12} className="text-yellow-400" />
    default: return <Minus size={12} className="text-gray-400" />
  }
}

const directionColor = (dir: string) => {
  switch (dir) {
    case 'positive': return 'text-green-400'
    case 'negative': return 'text-red-400'
    case 'mixed': return 'text-yellow-400'
    default: return 'text-gray-400'
  }
}

const typeColors: Record<string, string> = {
  price: 'bg-blue-500/20 text-blue-400',
  supply_chain: 'bg-amber-500/20 text-amber-400',
  regulatory: 'bg-purple-500/20 text-purple-400',
  operational: 'bg-cyan-500/20 text-cyan-400',
  demand: 'bg-green-500/20 text-green-400',
  reputational: 'bg-pink-500/20 text-pink-400',
}

export default function EventImpactBreakdown({ impacts }: EventImpactBreakdownProps) {
  const sorted = [...impacts].sort((a, b) => b.impact_score - a.impact_score)

  return (
    <div>
      <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
        AI Impact Analysis
      </h4>
      <div className="space-y-2">
        {sorted.map(impact => (
          <div
            key={impact.id}
            className="bg-gray-800/50 rounded-lg p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {directionIcon(impact.impact_direction)}
                <span className="text-xs font-medium text-white truncate">{impact.entity_name}</span>
                <span className={`text-[9px] px-1 py-0.5 rounded ${typeColors[impact.impact_type] || 'bg-gray-700 text-gray-400'}`}>
                  {impact.impact_type}
                </span>
              </div>
              <span className={`text-xs font-bold ${directionColor(impact.impact_direction)}`}>
                {(impact.impact_score * 100).toFixed(0)}%
              </span>
            </div>

            <div className="w-full bg-gray-700/50 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  impact.impact_direction === 'positive' ? 'bg-green-500'
                  : impact.impact_direction === 'negative' ? 'bg-red-500'
                  : 'bg-yellow-500'
                }`}
                style={{ width: `${impact.impact_score * 100}%` }}
              />
            </div>

            <div className="flex items-center gap-3 text-[9px] text-gray-500">
              <span className="flex items-center gap-1">
                <AlertTriangle size={8} />
                Confidence: {(impact.confidence * 100).toFixed(0)}%
              </span>
              <span>by {impact.generated_by}</span>
            </div>

            {impact.analysis_summary && (
              <p className="text-[10px] text-gray-400 leading-relaxed">{impact.analysis_summary}</p>
            )}

            {impact.affected_assets && impact.affected_assets.length > 0 && (
              <div className="pt-1 space-y-1">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider">Affected Assets</span>
                {impact.affected_assets.map(asset => (
                  <div key={asset.id} className="flex items-center justify-between bg-gray-800/50 rounded px-2 py-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-white">{asset.name}</span>
                      {asset.ticker && (
                        <span className="text-[9px] text-gray-500">{asset.ticker}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {asset.estimated_move !== null && (
                        <span className={`text-[10px] ${
                          asset.price_direction === 'up' ? 'text-green-400'
                          : asset.price_direction === 'down' ? 'text-red-400'
                          : 'text-yellow-400'
                        }`}>
                          {asset.price_direction === 'up' ? '+' : ''}{asset.estimated_move}%
                        </span>
                      )}
                      <span className="text-[9px] text-gray-500">{asset.time_horizon.replace('_', ' ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

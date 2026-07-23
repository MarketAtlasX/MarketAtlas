import { useEffect, useState } from 'react'
import { findAnalogous } from '../api/memoryApi'
import type { SimilarResult, Episode } from '../api/memoryApi'
import type { GeoEvent } from '../data/events'

interface Props {
  event: GeoEvent | null
  episodeId?: string
}

export default function HistoricalAnalogyPanel({ event, episodeId }: Props) {
  const [analogies, setAnalogies] = useState<SimilarResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!episodeId) return
    setLoading(true)
    setError(null)
    findAnalogous(episodeId)
      .then(setAnalogies)
      .catch(() => setError('Failed to load analogies'))
      .finally(() => setLoading(false))
  }, [episodeId])

  if (!event && !episodeId) return null

  if (loading) {
    return (
      <div className="p-3 text-xs text-gray-400">Searching historical analogies...</div>
    )
  }

  if (error) {
    return <div className="p-3 text-xs text-red-400">{error}</div>
  }

  if (analogies.length === 0) {
    return (
      <div className="p-3 text-xs text-gray-500">
        No historical analogies found for this event.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold dark:text-gray-300 text-gray-700 uppercase tracking-wider">
        Historical Analogies
      </h4>
      {analogies.map((a, i) => (
        <div
          key={i}
          className="p-2 rounded-lg dark:bg-gray-800/60 bg-gray-100/60 border dark:border-gray-700/50 border-gray-200"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium dark:text-white text-gray-900 truncate">
              {a.episode?.title ?? `Analogy ${i + 1}`}
            </span>
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                (a.similarity ?? 0) >= 0.7
                  ? 'bg-orange-500/20 text-orange-400'
                  : (a.similarity ?? 0) >= 0.4
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-blue-500/20 text-blue-400'
              }`}
            >
              {Math.round((a.similarity ?? 0) * 100)}% match
            </span>
          </div>
          {a.breakdown && (
            <div className="flex flex-wrap gap-1">
              {Object.entries(a.breakdown).map(([key, val]) => (
                <span
                  key={key}
                  className="text-[10px] dark:text-gray-400 text-gray-500 bg-gray-700/30 px-1 rounded"
                >
                  {key}: {Math.round(val * 100)}%
                </span>
              ))}
            </div>
          )}
          {a.episode?.summary && (
            <p className="text-[10px] dark:text-gray-400 text-gray-500 mt-1 line-clamp-2">
              {a.episode.summary}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

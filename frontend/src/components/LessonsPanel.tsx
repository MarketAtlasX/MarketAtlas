import { useEffect, useState } from 'react'
import { getLessons, generateLessons } from '../api/memoryApi'
import type { Lesson } from '../api/memoryApi'
import type { GeoEvent } from '../data/events'

interface Props {
  event: GeoEvent | null
  episodeId?: string
}

const CATEGORY_COLORS: Record<string, string> = {
  market: 'bg-green-500/20 text-green-400 border-green-500/30',
  conflict: 'bg-red-500/20 text-red-400 border-red-500/30',
  supply_chain: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  diplomatic: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  economic: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

export default function LessonsPanel({ event, episodeId }: Props) {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!episodeId) return
    setLoading(true)
    setError(null)
    getLessons(episodeId)
      .then(setLessons)
      .catch(() => setError('Failed to load lessons'))
      .finally(() => setLoading(false))
  }, [episodeId])

  const handleGenerate = async () => {
    if (!episodeId) return
    setGenerating(true)
    try {
      const newLessons = await generateLessons(episodeId)
      setLessons(prev => [...newLessons, ...prev])
    } catch {
      setError('Failed to generate lessons')
    } finally {
      setGenerating(false)
    }
  }

  if (!event && !episodeId) return null

  if (loading) {
    return <div className="p-3 text-xs text-gray-400">Loading derived lessons...</div>
  }

  if (error) {
    return <div className="p-3 text-xs text-red-400">{error}</div>
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold dark:text-gray-300 text-gray-700 uppercase tracking-wider">
          Derived Lessons
        </h4>
        {episodeId && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="text-[10px] px-2 py-0.5 rounded dark:bg-gray-700 bg-gray-200 dark:text-gray-300 text-gray-700 hover:dark:bg-gray-600 hover:bg-gray-300 disabled:opacity-50 transition-colors"
          >
            {generating ? 'Generating...' : 'Generate'}
          </button>
        )}
      </div>
      {lessons.length === 0 && (
        <p className="text-xs text-gray-500">No lessons derived yet. Click Generate to analyze this episode.</p>
      )}
      <div className="space-y-1.5">
        {lessons.map((l, i) => (
          <div
            key={i}
            className={`p-2 rounded-lg border text-[11px] ${
              CATEGORY_COLORS[l.category] ?? 'dark:bg-gray-800/60 bg-gray-100/60 dark:border-gray-700/50 border-gray-200 dark:text-gray-300 text-gray-700'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex-shrink-0">&#8226;</span>
              <span>{l.text}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] uppercase opacity-60">{l.category}</span>
              {l.confidence !== undefined && (
                <span className="text-[9px] opacity-50">
                  confidence: {Math.round(l.confidence * 100)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

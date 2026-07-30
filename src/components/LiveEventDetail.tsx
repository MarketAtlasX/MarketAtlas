import { useState, useEffect } from 'react'
import {
  AlertTriangle, ArrowLeft, Clock, ExternalLink, Globe,
  TrendingDown, TrendingUp, X,
} from 'lucide-react'
import type { LiveEvent, EventImpact, EventNewsArticle } from '../api/liveEventsApi'
import EventImpactBreakdown from './EventImpactBreakdown'
import RelatedNewsFeed from './RelatedNewsFeed'
import { Skeleton } from './Skeleton'

interface LiveEventDetailProps {
  event: LiveEvent
  onClose: () => void
  getEvent: (id: string) => Promise<(LiveEvent & { impacts: EventImpact[]; news_articles: EventNewsArticle[] }) | null>
}

const severityColor = (s: number): string => {
  if (s >= 8) return 'bg-red-500'
  if (s >= 6) return 'bg-orange-500'
  if (s >= 4) return 'bg-yellow-500'
  return 'bg-green-500'
}

const typeBadge: Record<string, string> = {
  geopolitical: 'bg-red-500/20 text-red-400 border-red-500/30',
  economic: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  corporate: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  market_moving: 'bg-green-500/20 text-green-400 border-green-500/30',
  regulatory: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  natural_disaster: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
}

const statusBadge: Record<string, string> = {
  breaking: 'bg-red-500/30 text-red-300 animate-pulse',
  confirmed: 'bg-blue-500/20 text-blue-300',
  developing: 'bg-yellow-500/20 text-yellow-300',
  resolved: 'bg-gray-500/20 text-gray-400',
  archived: 'bg-gray-500/10 text-gray-500',
}

export default function LiveEventDetail({ event, onClose, getEvent }: LiveEventDetailProps) {
  const [fullEvent, setFullEvent] = useState<(LiveEvent & { impacts: EventImpact[]; news_articles: EventNewsArticle[] }) | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getEvent(event.id).then(data => {
      setFullEvent(data)
      setLoading(false)
    })
  }, [event.id, getEvent])

  const impacts = fullEvent?.impacts || []
  const news = fullEvent?.news_articles || []

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
          <ArrowLeft size={14} className="text-gray-400" />
        </button>
        <h2 className="text-sm font-semibold text-white truncate flex-1">Event Details</h2>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
          <X size={14} className="text-gray-400" />
        </button>
      </div>

      <div className="overflow-y-auto flex-1">
        <div className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className={`w-1.5 h-12 rounded-full flex-shrink-0 ${severityColor(event.severity)}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${typeBadge[event.event_type] || typeBadge.geopolitical}`}>
                  {event.event_type}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusBadge[event.status] || statusBadge.confirmed}`}>
                  {event.status}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{event.title}</h3>
              {event.description && (
                <p className="text-xs text-gray-400 leading-relaxed">{event.description}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800/50 rounded-lg p-2.5">
              <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
                <AlertTriangle size={10} />
                Severity
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${severityColor(event.severity)}`} />
                <span className="text-sm font-bold text-white">{event.severity.toFixed(1)}</span>
                <span className="text-[10px] text-gray-500">/ 10</span>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-2.5">
              <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
                {event.impact_score !== null && event.impact_score >= 0.5
                  ? <TrendingUp size={10} />
                  : <TrendingDown size={10} />
                }
                Impact Score
              </div>
              <span className={`text-sm font-bold ${
                event.impact_score !== null && event.impact_score >= 0.6 ? 'text-red-400'
                : event.impact_score !== null && event.impact_score >= 0.3 ? 'text-yellow-400'
                : 'text-green-400'
              }`}>
                {event.impact_score !== null ? `${(event.impact_score * 100).toFixed(0)}%` : 'N/A'}
              </span>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-2.5">
              <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
                <Clock size={10} />
                Confidence
              </div>
              <span className="text-sm font-bold text-white">
                {event.confidence !== null ? `${(event.confidence * 100).toFixed(0)}%` : 'N/A'}
              </span>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-2.5">
              <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
                <Globe size={10} />
                Region
              </div>
              <span className="text-sm font-bold text-white truncate block">
                {event.region || event.country_code || 'Global'}
              </span>
            </div>
          </div>

          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}

          {!loading && impacts.length > 0 && (
            <EventImpactBreakdown impacts={impacts} />
          )}

          {!loading && impacts.length === 0 && (
            <div className="text-center py-6 text-xs text-gray-500">
              <AlertTriangle size={20} className="mx-auto mb-2 opacity-50" />
              <p>No impact analysis available yet</p>
              <p className="text-[10px] text-gray-600 mt-1">Analysis runs automatically after event creation</p>
            </div>
          )}

          {event.country_code && (
            <div className="bg-gray-800/30 rounded-lg p-3">
              <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
                <Globe size={10} />
                Location
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <span>Country: {event.country_code}</span>
                {event.lat && event.lng && (
                  <span className="text-gray-500">
                    ({event.lat.toFixed(2)}, {event.lng.toFixed(2)})
                  </span>
                )}
              </div>
            </div>
          )}

          {!loading && news.length > 0 && (
            <RelatedNewsFeed articles={news} />
          )}

          {event.source_urls && event.source_urls.length > 0 && (
            <div className="bg-gray-800/30 rounded-lg p-3">
              <div className="text-[10px] text-gray-500 mb-2">Sources</div>
              <div className="space-y-1">
                {event.source_urls.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 truncate"
                  >
                    <ExternalLink size={10} />
                    {s.title || s.url}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="text-[10px] text-gray-600 space-y-0.5 pb-4">
            <p>Detected: {event.detected_at ? new Date(event.detected_at).toLocaleString() : 'N/A'}</p>
            <p>Updated: {new Date(event.updated_at).toLocaleString()}</p>
            {event.resolved_at && <p>Resolved: {new Date(event.resolved_at).toLocaleString()}</p>}
            {event.source && <p>Source: {event.source}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

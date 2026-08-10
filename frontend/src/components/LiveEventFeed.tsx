import { useState, useMemo } from 'react'
import {
  AlertTriangle, Clock, Filter, Globe,
  Radio, Search, TrendingDown, TrendingUp,
} from 'lucide-react'
import { useLiveEvents } from '../hooks/useLiveEvents'
import { useEventAlerts } from '../hooks/useEventAlerts'
import LiveEventDetail from './LiveEventDetail'
import LiveEventToolbar from './LiveEventToolbar'
import AlertPanel from './AlertPanel'
import { Skeleton } from './Skeleton'
import { EmptyState } from './EmptyState'
import type { LiveEvent, LiveEventFilterParams } from '../api/liveEventsApi'

const severityColor = (s: number): string => {
  if (s >= 8) return 'bg-red-500'
  if (s >= 6) return 'bg-orange-500'
  if (s >= 4) return 'bg-yellow-500'
  return 'bg-green-500'
}

const severityTextColor = (s: number): string => {
  if (s >= 8) return 'text-red-400'
  if (s >= 6) return 'text-orange-400'
  if (s >= 4) return 'text-yellow-400'
  return 'text-green-400'
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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function LiveEventFeed() {
  const { events, isLoading, error, total, filters, setFilters, loadMore, refresh, getEvent } = useLiveEvents()
  const { alerts, unreadCount, markRead, markAllRead } = useEventAlerts()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAlerts, setShowAlerts] = useState(false)
  const [showToolbar, setShowToolbar] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const selectedEvent = useMemo(
    () => events.find(e => e.id === selectedId) || null,
    [events, selectedId],
  )

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setFilters(prev => ({ ...prev, keyword: query || undefined, skip: 0 }))
  }

  const handleFilterChange = (newFilters: LiveEventFilterParams) => {
    setFilters(prev => ({ ...prev, ...newFilters, skip: 0 }))
  }

  if (selectedId && selectedEvent) {
    return (
      <LiveEventDetail
        event={selectedEvent}
        onClose={() => setSelectedId(null)}
        getEvent={getEvent}
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Radio size={16} className="text-red-400 animate-pulse" />
          <h2 className="text-sm font-semibold text-white">Live Events</h2>
          <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
            {total}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className="relative p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <AlertTriangle size={14} className="text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowToolbar(!showToolbar)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Filter size={14} className="text-gray-400" />
          </button>
          <button
            onClick={refresh}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
              <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-4 py-2 border-b border-white/10">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            className="w-full bg-gray-800/50 border border-white/10 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>
      </div>

      {showAlerts && (
        <AlertPanel
          alerts={alerts}
          unreadCount={unreadCount}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          onClose={() => setShowAlerts(false)}
          onAlertClick={(alert) => {
            if (alert.event_id) {
              setSelectedId(alert.event_id)
              setShowAlerts(false)
            }
          }}
        />
      )}

      {showToolbar && (
        <LiveEventToolbar
          filters={filters}
          onChange={handleFilterChange}
          onClose={() => setShowToolbar(false)}
        />
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading && events.length === 0 && (
          <div className="p-4 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-800/30 rounded-lg p-3 space-y-2">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && events.length === 0 && (
          <EmptyState
            icon={<Radio size={24} />}
            title="No live events"
            description="Events will appear here as they are detected."
          />
        )}

        {events.map(event => (
          <button
            key={event.id}
            onClick={() => setSelectedId(event.id)}
            className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5"
          >
            <div className="flex items-start gap-3">
              <div className={`w-1.5 h-full min-h-[3rem] rounded-full self-stretch flex-shrink-0 ${severityColor(event.severity)}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${typeBadge[event.event_type] || typeBadge.geopolitical}`}>
                    {event.event_type}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusBadge[event.status] || statusBadge.confirmed}`}>
                    {event.status}
                  </span>
                  {event.country_code && (
                    <span className="text-[10px] text-gray-500">{event.country_code}</span>
                  )}
                </div>
                <h3 className="text-xs font-medium text-white truncate mb-0.5">{event.title}</h3>
                {event.description && (
                  <p className="text-[10px] text-gray-400 line-clamp-2 mb-1.5">{event.description}</p>
                )}
                <div className="flex items-center gap-3 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {timeAgo(event.first_seen_at)}
                  </span>
                  <span className={`flex items-center gap-1 ${severityTextColor(event.severity)}`}>
                    <AlertTriangle size={10} />
                    {event.severity.toFixed(1)}
                  </span>
                  {event.impact_score !== null && (
                    <span className="flex items-center gap-1 text-blue-400">
                      {event.impact_score >= 0.5 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {(event.impact_score * 100).toFixed(0)}%
                    </span>
                  )}
                  {event.region && (
                    <span className="flex items-center gap-1">
                      <Globe size={10} />
                      {event.region}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}

        {events.length > 0 && events.length < total && (
          <button
            onClick={loadMore}
            className="w-full py-3 text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Load more ({total - events.length} remaining)
          </button>
        )}

        {error && (
          <div className="p-4 text-xs text-red-400 text-center">{error}</div>
        )}
      </div>
    </div>
  )
}

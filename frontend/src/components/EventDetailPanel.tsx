import { X, AlertTriangle, TrendingUp, TrendingDown, Minus, Clock, MapPin } from 'lucide-react'
import { getSimilarEvents } from '../data/events'
import type { GeoEvent } from '../data/events'
import HistoricalAnalogyPanel from './HistoricalAnalogyPanel'
import LessonsPanel from './LessonsPanel'

interface EventDetailPanelProps {
  event: GeoEvent
  onClose: () => void
  onEventClick: (event: GeoEvent) => void
  onShowExplain: (countryCode: string) => void
}

const typeBadgeColors: Record<string, string> = {
  conflict: 'from-red-600/40 to-red-800/20 border-red-500/30',
  economic: 'from-amber-600/40 to-amber-800/20 border-amber-500/30',
  diplomatic: 'from-blue-600/40 to-blue-800/20 border-blue-500/30',
  natural: 'from-cyan-600/40 to-cyan-800/20 border-cyan-500/30',
  market: 'from-green-600/40 to-green-800/20 border-green-500/30',
  military: 'from-orange-600/40 to-orange-800/20 border-orange-500/30',
}

const typeIcons: Record<string, string> = {
  conflict: '🔴',
  economic: '📊',
  diplomatic: '🤝',
  natural: '🌊',
  market: '💹',
  military: '⚔️',
}

const severityColors = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#450a0a']

export default function EventDetailPanel({ event, onClose, onEventClick, onShowExplain }: EventDetailPanelProps) {
  const similar = getSimilarEvents(event)

  return (
    <div className="absolute top-4 right-4 z-30 w-96 bg-gray-900/95 backdrop-blur-md rounded-xl border border-gray-700/50 shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <span className="text-lg">{typeIcons[event.type] || '📌'}</span>
          <div>
            <h3 className="text-sm font-semibold text-white">{event.title}</h3>
            <p className="text-[10px] text-gray-400 capitalize">{event.type} · {event.isHistorical ? 'Historical' : 'Real-time'}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="overflow-y-auto flex-1">
        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-300 leading-relaxed">{event.description}</p>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800/50 rounded-lg p-2.5">
              <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-1">
                <AlertTriangle size={10} />
                Severity
              </div>
              <div className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: severityColors[event.severity - 1] || '#ef4444' }}
                />
                <span className="text-sm font-bold text-white">{event.severity}/10</span>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-2.5">
              <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-1">
                {event.sentiment === 'positive' ? <TrendingUp size={10} /> : event.sentiment === 'negative' ? <TrendingDown size={10} /> : <Minus size={10} />}
                Sentiment
              </div>
              <span className={`text-sm font-bold capitalize ${
                event.sentiment === 'positive' ? 'text-green-400' :
                event.sentiment === 'negative' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {event.sentiment}
              </span>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-2.5">
            <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-1.5">
              <MapPin size={10} />
              Location
            </div>
            <p className="text-xs text-gray-300">
              {event.lat.toFixed(2)}°, {event.lng.toFixed(2)}°
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-2.5">
            <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-1.5">
              <Clock size={10} />
              {event.isHistorical ? 'Historical Date' : 'Timestamp'}
            </div>
            <p className="text-xs text-gray-300">
              {new Date(event.timestamp).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>

          {event.affectedSectors.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-400 mb-1.5">Affected Sectors</p>
              <div className="flex flex-wrap gap-1">
                {event.affectedSectors.map(s => (
                  <span key={s} className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] border border-purple-500/20">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {event.affectedCommodities.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-400 mb-1.5">Affected Commodities</p>
              <div className="flex flex-wrap gap-1">
                {event.affectedCommodities.map(c => (
                  <span key={c} className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] border border-amber-500/20">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {similar.length > 0 && (
            <div className="pt-2 border-t border-gray-700/30">
              <p className="text-[10px] text-gray-400 mb-2">Similar Events</p>
              <div className="space-y-1.5">
                {similar.map(s => (
                  <button
                    key={s.id}
                    onClick={() => onEventClick(s)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/30 hover:bg-gray-800/60 transition-colors text-left"
                  >
                    <span className="text-xs">{typeIcons[s.type] || '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-200 truncate">{s.title}</p>
                      <p className="text-[10px] text-gray-500">{s.severity}/10 · {s.type} · {s.isHistorical ? 'Historical' : 'Current'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => onShowExplain(event.countryCode)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-blue-600/30 to-purple-600/30 hover:from-blue-600/50 hover:to-purple-600/50 border border-blue-500/20 text-xs text-blue-300 transition-all mt-1"
          >
            Show causal path from {event.countryCode}
          </button>

          <div className="pt-2 border-t border-gray-700/30">
            <HistoricalAnalogyPanel event={event} />
          </div>

          <div className="pt-2 border-t border-gray-700/30">
            <LessonsPanel event={event} />
          </div>
        </div>
      </div>
    </div>
  )
}

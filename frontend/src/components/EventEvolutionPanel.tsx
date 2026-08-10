import { useState, useMemo } from 'react'
import { Clock, ArrowRight, AlertTriangle, TrendingUp, TrendingDown, Minus, History, X, Globe } from 'lucide-react'
import { events, historicalEvents, getSimilarEvents } from '../data/events'
import type { GeoEvent } from '../data/events'
import type { Country } from '../data/countries'

interface EventEvolutionPanelProps {
  country: Country | null
  onEventClick?: (event: GeoEvent) => void
  onClose?: () => void
}

const typeIcons: Record<string, string> = {
  conflict: '⚔️', economic: '📊', diplomatic: '🤝',
  natural: '🌊', market: '💹', military: '🔴',
}

const typeColors: Record<string, string> = {
  conflict: 'bg-red-500/20 text-red-300 border-red-500/30',
  economic: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  diplomatic: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  natural: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  market: 'bg-green-500/20 text-green-300 border-green-500/30',
  military: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
}

const severityDot = (s: number) => {
  const colors = ['bg-green-500', 'bg-green-500', 'bg-yellow-500', 'bg-yellow-500', 'bg-orange-500', 'bg-orange-500', 'bg-red-500', 'bg-red-500', 'bg-red-600', 'bg-red-700']
  return `w-2 h-2 rounded-full ${colors[Math.min(s - 1, 9)]}`
}

function EventCard({
  event,
  isHistorical,
  onClick,
}: {
  event: GeoEvent
  isHistorical: boolean
  onClick?: (e: GeoEvent) => void
}) {
  const consequences = [
    ...event.affectedSectors.map(s => ({ type: 'sector' as const, label: s })),
    ...event.affectedCommodities.map(c => ({ type: 'commodity' as const, label: c })),
  ]

  return (
    <div
      onClick={() => onClick?.(event)}
      className={`rounded-lg border p-3 transition-all cursor-pointer ${
        isHistorical
          ? 'dark:bg-gray-800/30 bg-gray-50 border-gray-700/30 dark:border-white/5'
          : 'dark:bg-gray-800/50 bg-gray-100 border-gray-700/50 dark:border-white/10'
      } ${onClick ? 'hover:dark:bg-gray-700/50 hover:bg-gray-200' : ''}`}
    >
      <div className="flex items-start gap-2">
        <div className="relative mt-0.5">
          <span className="text-base">{typeIcons[event.type] || '📌'}</span>
          <div className={`${severityDot(event.severity)} absolute -top-0.5 -right-0.5 ring-1 ring-gray-900`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold dark:text-white text-gray-900">{event.title}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${typeColors[event.type]}`}>
              {event.type}
            </span>
            {isHistorical && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full border bg-purple-500/20 text-purple-300 border-purple-500/30">
                historical
              </span>
            )}
          </div>
          <p className="text-[10px] dark:text-gray-400 text-gray-600 mt-1 leading-relaxed line-clamp-2">
            {event.description}
          </p>

          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1 dark:bg-gray-700 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{
                  width: `${(event.severity / 10) * 100}%`,
                  backgroundColor: event.severity >= 7 ? '#ef4444' : event.severity >= 5 ? '#f97316' : event.severity >= 3 ? '#eab308' : '#22c55e'
                }}
              />
            </div>
            <span className="text-[9px] font-mono dark:text-gray-400 text-gray-500">{event.severity}/10</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] dark:text-gray-500 text-gray-400">
            <span className="flex items-center gap-1">
              <AlertTriangle size={9} />
              Severity
            </span>
            <span className="flex items-center gap-1">
              {event.sentiment === 'positive' ? <TrendingUp size={9} className="text-green-400" /> :
               event.sentiment === 'negative' ? <TrendingDown size={9} className="text-red-400" /> :
               <Minus size={9} />}
              {event.sentiment}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={9} />
              {new Date(event.timestamp).toLocaleDateString()}
            </span>
            {consequences.length > 0 && (
              <span className="flex items-center gap-1 ml-auto">
                <ArrowRight size={9} className="dark:text-gray-400 text-gray-500" />
                {consequences.length} impacts
              </span>
            )}
          </div>

          {consequences.length > 0 && (
            <div className="mt-2 pt-2 border-t dark:border-white/10 border-gray-200">
              <div className="flex items-center gap-1 text-[9px] dark:text-gray-500 text-gray-400 mb-1">
                <ArrowRight size={9} />
                Consequences ({consequences.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {consequences.slice(0, 4).map(c => (
                  <span key={c.label}
                    className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
                      c.type === 'sector'
                        ? 'bg-purple-500/15 text-purple-300 border-purple-500/20'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/20'
                    }`}
                  >
                    {c.label}
                  </span>
                ))}
                {consequences.length > 4 && (
                  <span className="text-[9px] dark:text-gray-500 text-gray-400 font-medium">+{consequences.length - 4} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function EventEvolutionPanel({ country, onEventClick, onClose }: EventEvolutionPanelProps) {
  const [showHistorical, setShowHistorical] = useState(true)

  const { timeline, connections } = useMemo(() => {
    const relevant = country
      ? [...events.filter(e => e.countryCode === country.code),
         ...historicalEvents.filter(e => e.countryCode === country.code)]
      : [...events, ...historicalEvents]

    const current = events.filter(e =>
      country ? e.countryCode === country.code : true
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    const historical = historicalEvents.filter(e =>
      country ? e.countryCode === country.code : true
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    const conns: { from: GeoEvent; to: GeoEvent; reason: string }[] = []
    for (const ce of current) {
      const similar = getSimilarEvents(ce)
      for (const sim of similar) {
        if (sim.isHistorical) {
          conns.push({ from: sim, to: ce, reason: 'Similar pattern' })
        }
      }
    }

    return { timeline: { current, historical }, connections: conns }
  }, [country])

  const totalImpact = useMemo(() => {
    let score = 0
    for (const e of timeline.current) {
      score += e.severity * (e.sentiment === 'negative' ? 1.5 : e.sentiment === 'positive' ? 0.5 : 1)
    }
    return Math.round(score / Math.max(timeline.current.length, 1))
  }, [timeline])

  const negativeCount = useMemo(() =>
    timeline.current.filter(e => e.sentiment === 'negative').length, [timeline])

  const positiveCount = useMemo(() =>
    timeline.current.filter(e => e.sentiment === 'positive').length, [timeline])

  return (
    <div className="flex flex-col h-full">
      {onClose && (
        <div className="flex items-center justify-between p-3 border-b dark:border-white/10 border-gray-200">
          <h3 className="text-xs font-semibold dark:text-gray-300 text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <History size={12} /> Event Evolution
          </h3>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-[9px] dark:bg-gray-800/50 bg-gray-100 rounded-full px-2 py-1">
              <span className="dark:text-gray-400 text-gray-500">Sentiment:</span>
              <span className="text-red-400 font-bold">{negativeCount}</span>
              <span className="dark:text-gray-500 text-gray-400">/</span>
              <span className="text-green-400 font-bold">{positiveCount}</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] dark:bg-gray-800/50 bg-gray-100 rounded-full px-2 py-1">
              <span className="dark:text-gray-400 text-gray-500">Impact:</span>
              <span className={totalImpact >= 7 ? 'text-red-400 font-bold' : totalImpact >= 4 ? 'text-yellow-400 font-bold' : 'text-green-400 font-bold'}>
                {totalImpact}
              </span>
            </div>
            <button
              onClick={() => setShowHistorical(v => !v)}
              className={`text-[9px] px-2 py-1 rounded-full transition-colors ${
                showHistorical
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'dark:text-gray-500 text-gray-400 border border-transparent'
              }`}
            >
              Historical
            </button>
            <button onClick={onClose} className="dark:text-gray-400 text-gray-500 hover:dark:text-white hover:text-gray-700 transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="flex items-center gap-2 text-[8px] dark:text-gray-600 text-gray-400 px-1 pb-1 border-b dark:border-white/5 border-gray-200">
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Calm</span>
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> Moderate</span>
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Severe</span>
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Critical</span>
          <span className="ml-auto font-medium text-[7px] dark:text-gray-600 text-gray-400">legend</span>
        </div>

        {timeline.current.length === 0 && timeline.historical.length === 0 && (
          <div className="text-center py-12 animate-in fade-in">
            <div className="relative mx-auto mb-3 w-12 h-12">
              <Globe size={24} className="absolute inset-0 m-auto dark:text-gray-600 text-gray-400 animate-spin-slow" style={{ animationDuration: '6s' }} />
            </div>
            <p className="text-xs dark:text-gray-500 text-gray-400">No events for this country</p>
            <p className="text-[9px] dark:text-gray-600 text-gray-400 mt-1">Select a different country or switch to global view</p>
          </div>
        )}

        {connections.length > 0 && (
          <div className="mb-4">
            <h4 className="text-[10px] font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1">
              <History size={10} /> Evolution Chains
            </h4>
            <div className="space-y-1.5">
              {connections.slice(0, 3).map((c, i) => (
                <div key={i} className="flex items-start gap-1.5 dark:bg-gray-800/20 bg-gray-50 rounded-lg p-2">
                  <span className="text-[9px] mt-0.5">{typeIcons[c.from.type] || '📌'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] dark:text-gray-300 text-gray-700 font-medium truncate">{c.from.title}</p>
                    <div className="flex items-center gap-1 my-0.5">
                      <ArrowRight size={8} className="dark:text-cyan-500 text-cyan-600" />
                      <span className="text-[8px] dark:text-cyan-400 text-cyan-600">{c.reason}</span>
                    </div>
                    <p className="text-[10px] dark:text-gray-300 text-gray-700 font-medium truncate">{c.to.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {timeline.current.length > 0 && (
          <div>
            <h4 className="text-[10px] font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Current Events
            </h4>
            <div className="space-y-2">
              {timeline.current.map(e => (
                <EventCard key={e.id} event={e} isHistorical={false} onClick={onEventClick} />
              ))}
            </div>
          </div>
        )}

        {showHistorical && timeline.historical.length > 0 && (
          <div>
            <h4 className="text-[10px] font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1">
              <History size={10} />
              Historical Precedents
            </h4>
            <div className="space-y-2">
              {timeline.historical.map(e => (
                <EventCard key={e.id} event={e} isHistorical={true} onClick={onEventClick} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect, useMemo } from 'react'
import { Clock, AlertTriangle, TrendingUp, Globe } from 'lucide-react'
import type { Country } from '../data/countries'
import { TimelineSkeleton } from './Skeleton'
import { EmptyState } from './EmptyState'
import { fetchEvents } from '../api/geopoliticalApi'
import type { EventItem as ApiEventItem } from '../api/geopoliticalApi'

type EventType = 'positive' | 'negative' | 'neutral'

interface DisplayEvent {
  time: string
  title: string
  desc: string
  type: EventType
  region: string
  countryCode: string
}

const fallbackEvents: DisplayEvent[] = [
  { time: '2m ago', title: 'US Fed Signals Rate Cut', desc: 'Federal Reserve hints at dovish stance amid slowing inflation.', type: 'positive', region: 'US', countryCode: 'US' },
  { time: '15m ago', title: 'Russia Energy Sanctions Escalate', desc: 'New EU sanctions target Russian oil exports, supply concerns rise.', type: 'negative', region: 'EU', countryCode: 'RU' },
  { time: '1h ago', title: 'China Tech Sector Rally', desc: 'Hang Seng Tech index surges 4% on regulatory easing expectations.', type: 'positive', region: 'CN', countryCode: 'CN' },
  { time: '2h ago', title: 'Middle East Tensions Rise', desc: 'Geopolitical risks spike after military escalation in the region.', type: 'negative', region: 'ME', countryCode: 'IR' },
  { time: '3h ago', title: 'India GDP Growth Beats Estimates', desc: 'Q3 GDP expands 7.2%, driven by manufacturing and services.', type: 'positive', region: 'IN', countryCode: 'IN' },
  { time: '5h ago', title: 'Oil Prices Volatile', desc: 'Brent crude swings 3% amid conflicting supply signals from OPEC+.', type: 'neutral', region: 'Global', countryCode: 'SA' },
  { time: '6h ago', title: 'European Markets Mixed', desc: 'Stoxx 600 fluctuates as investors weigh earnings against ECB outlook.', type: 'neutral', region: 'EU', countryCode: 'DE' },
  { time: '8h ago', title: 'Japan Nikkei Hits 5-Year High', desc: 'BoJ maintains accommodative stance, weakening yen boosts exports.', type: 'positive', region: 'JP', countryCode: 'JP' },
  { time: '12h ago', title: 'UK Inflation Drops Below Target', desc: 'BoE considers rate cuts as CPI falls to 1.8%.', type: 'positive', region: 'GB', countryCode: 'GB' },
  { time: '1d ago', title: 'Brazil Central Bank Holds Rates', desc: 'Selic rate maintained at 13.75% amid fiscal uncertainty.', type: 'neutral', region: 'BR', countryCode: 'BR' },
]

function mapApiEventToDisplay(apiEvent: ApiEventItem): DisplayEvent {
  const text = `${apiEvent.title} ${apiEvent.description}`.toLowerCase()
  let type: EventType = 'neutral'
  if (/positive|rally|surge|growth|beat|gain|rise|high|strong|up/.test(text)) type = 'positive'
  else if (/negative|sanctions|tensions|escalate|volatile|drop|fall|loss|risk|weak|down/.test(text)) type = 'negative'

  const hoursAgo = Math.floor((Date.now() - new Date(apiEvent.event_date).getTime()) / 3600000)
  const timeStr = hoursAgo < 1 ? `${Math.floor((Date.now() - new Date(apiEvent.event_date).getTime()) / 60000)}m ago`
    : hoursAgo < 24 ? `${hoursAgo}h ago`
    : `${Math.floor(hoursAgo / 24)}d ago`

  return {
    time: timeStr,
    title: apiEvent.title,
    desc: apiEvent.description,
    type,
    region: apiEvent.event_type === 'geopolitical' ? 'Global' : apiEvent.source || 'Global',
    countryCode: 'US',
  }
}

const typeStyles: Record<EventType, string> = {
  positive: 'border-l-green-500 bg-green-500/5',
  negative: 'border-l-red-500 bg-red-500/5',
  neutral: 'border-l-yellow-500 bg-yellow-500/5',
}

const typeIcons: Record<EventType, typeof TrendingUp> = {
  positive: TrendingUp,
  negative: AlertTriangle,
  neutral: Globe,
}

const regionColors: Record<string, string> = {
  US: 'bg-blue-500/20 text-blue-400',
  EU: 'bg-purple-500/20 text-purple-400',
  CN: 'bg-red-500/20 text-red-400',
  ME: 'bg-orange-500/20 text-orange-400',
  IN: 'bg-orange-500/20 text-orange-400',
  Global: 'bg-cyan-500/20 text-cyan-400',
  JP: 'bg-pink-500/20 text-pink-400',
  GB: 'bg-blue-500/20 text-blue-400',
  BR: 'bg-green-500/20 text-green-400',
  RU: 'bg-red-500/20 text-red-400',
  IR: 'bg-orange-500/20 text-orange-400',
  SA: 'bg-yellow-500/20 text-yellow-400',
  DE: 'bg-purple-500/20 text-purple-400',
}

interface EventTimelineProps {
  country?: Country | null
}

export default function EventTimeline({ country }: EventTimelineProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [apiEvents, setApiEvents] = useState<DisplayEvent[] | null>(null)
  useEffect(() => {
    setLoading(true)
    setError(null)
    setApiEvents(null)

    fetchEvents({ limit: 20 })
      .then((res) => {
        const mapped = (res.items || []).map(mapApiEventToDisplay)
        if (mapped.length > 0) setApiEvents(mapped)
      })
      .catch((err) => {
        setError(err.message || 'Failed to load events')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [country])

  const events = useMemo(() => {
    const source = apiEvents || fallbackEvents
    if (!country) return source.slice(0, 5)
    const countryRelated = source.filter(e =>
      e.title.toLowerCase().includes(country.name.toLowerCase()) ||
      e.desc.toLowerCase().includes(country.name.toLowerCase())
    )
    return countryRelated.length > 0 ? countryRelated : source.slice(0, 3)
  }, [country, apiEvents])

  if (loading) return <TimelineSkeleton />

  if (error) {
    return <EmptyState title="Failed to load events" description={error} />
  }

  if (events.length === 0) {
    return <EmptyState title="No events" description="No recent events for this country." />
  }

  return (
    <div className="space-y-2">
      {events.map((event, i) => {
        const Icon = typeIcons[event.type]
        return (
          <div
            key={i}
            className={`border-l-2 pl-3 py-2 rounded-r-lg ${typeStyles[event.type]} transition-colors hover:dark:bg-white/5 hover:bg-gray-100 cursor-default`}
          >
            <div className="flex items-start gap-2">
              <Icon className="w-4 h-4 mt-0.5 shrink-0 dark:text-gray-400 text-gray-600" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium dark:text-white text-gray-900">{event.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${regionColors[event.region] || 'bg-gray-500/20 text-gray-400'}`}>
                    {event.region}
                  </span>
                </div>
                <p className="text-xs dark:text-gray-400 text-gray-600 mt-0.5">{event.desc}</p>
              </div>
              <div className="flex items-center gap-1 text-[10px] dark:text-gray-500 text-gray-400 shrink-0">
                <Clock className="w-3 h-3" />
                {event.time}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

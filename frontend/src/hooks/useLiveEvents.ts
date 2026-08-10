import { useState, useEffect, useCallback, useRef } from 'react'
import { liveEventsApi, type LiveEvent, type LiveEventFilterParams, type EventImpact, type EventNewsArticle } from '../api/liveEventsApi'

interface UseLiveEventsReturn {
  events: LiveEvent[]
  isLoading: boolean
  error: string | null
  total: number
  filters: LiveEventFilterParams
  setFilters: (filters: LiveEventFilterParams | ((prev: LiveEventFilterParams) => LiveEventFilterParams)) => void
  loadMore: () => void
  refresh: () => void
  getEvent: (id: string) => Promise<LiveEvent & { impacts: EventImpact[]; news_articles: EventNewsArticle[] } | null>
}

export function useLiveEvents(): UseLiveEventsReturn {
  const [events, setEvents] = useState<LiveEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [filters, setFiltersState] = useState<LiveEventFilterParams>({
    limit: 50,
    sortBy: 'first_seen_at',
    sortDesc: true,
  })

  const setFilters = useCallback((
    value: LiveEventFilterParams | ((prev: LiveEventFilterParams) => LiveEventFilterParams),
  ) => {
    setFiltersState(value)
  }, [])
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const fetchEvents = useCallback(async (append: boolean = false) => {
    setIsLoading(true)
    setError(null)
    try {
      if (append) {
        const res = await liveEventsApi.list(filters)
        setEvents(prev => [...prev, ...res.items])
        setTotal(res.total)
      } else {
        const res = await liveEventsApi.list(filters)
        setEvents(res.items)
        setTotal(res.total)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events')
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchEvents(false)
  }, [fetchEvents])

  useEffect(() => {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`

    function connect() {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'subscribe', channel: 'live_events' }))
        ws.send(JSON.stringify({ type: 'subscribe', channel: 'impacts' }))
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'live_event_new') {
            setEvents(prev => [msg.data, ...prev].slice(0, 200))
            setTotal(prev => prev + 1)
          } else if (msg.type === 'live_event_update' || msg.type === 'live_event_resolved') {
            setEvents(prev => prev.map(e => e.id === msg.data.id ? msg.data : e))
          }
        } catch { /* ignore */ }
      }

      ws.onclose = () => {
        wsRef.current = null
        if (!reconnectTimerRef.current) {
          reconnectTimerRef.current = setTimeout(connect, 5000)
        }
      }

      ws.onerror = () => { ws.close() }
    }

    connect()

    return () => {
      clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
    }
  }, [])

  const loadMore = useCallback(() => {
    setFilters(prev => ({ ...prev, skip: (prev.skip || 0) + (prev.limit || 50) }))
  }, [])

  const refresh = useCallback(() => {
    setFilters(prev => ({ ...prev, skip: 0 }))
  }, [])

  const getEvent = useCallback(async (id: string) => {
    try {
      return await liveEventsApi.get(id)
    } catch {
      return null
    }
  }, [])

  return { events, isLoading, error, total, filters, setFilters, loadMore, refresh, getEvent }
}

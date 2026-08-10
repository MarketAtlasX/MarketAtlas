import { useState, useEffect, useCallback, useRef } from 'react'
import type { UserAlert } from '../api/liveEventsApi'

interface UseEventAlertsReturn {
  alerts: UserAlert[]
  unreadCount: number
  markRead: (id: string) => void
  markAllRead: () => void
}

export function useEventAlerts(): UseEventAlertsReturn {
  const [alerts, setAlerts] = useState<UserAlert[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
    let reconnectTimer: ReturnType<typeof setTimeout>
    let closed = false

    function connect() {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'subscribe', channel: 'alerts' }))
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'alert') {
            const alert = msg.data as UserAlert
            setAlerts(prev => [alert, ...prev].slice(0, 50))
            setUnreadCount(prev => prev + 1)
          }
        } catch { /* ignore */ }
      }

      ws.onclose = () => {
        wsRef.current = null
        if (!closed) {
          reconnectTimer = setTimeout(connect, 5000)
        }
      }

      ws.onerror = () => { ws.close() }
    }

    connect()

    return () => {
      closed = true
      clearTimeout(reconnectTimer)
      wsRef.current?.close()
    }
  }, [])

  const markRead = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  const markAllRead = useCallback(() => {
    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })))
    setUnreadCount(0)
  }, [])

  return { alerts, unreadCount, markRead, markAllRead }
}

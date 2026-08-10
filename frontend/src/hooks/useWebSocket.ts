import { useEffect, useRef, useState, useCallback } from 'react'

interface WSMessage {
  type: string
  channel?: string
  data?: unknown
  timestamp?: string
}

type MessageHandler = (msg: WSMessage) => void

export function useWebSocket(handlers?: Record<string, MessageHandler>) {
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  const subscribe = useCallback((channel: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', channel }))
    }
  }, [])

  const unsubscribe = useCallback((channel: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', channel }))
    }
  }, [])

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    const wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws'

    let reconnectTimer: ReturnType<typeof setTimeout>
    let closed = false

    function connect() {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        ws.send(JSON.stringify({ type: 'subscribe', channel: 'signals' }))
        ws.send(JSON.stringify({ type: 'subscribe', channel: 'events' }))
      }

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data)
          if (msg.type && handlersRef.current?.[msg.type]) {
            handlersRef.current[msg.type](msg)
          }
        } catch { /* ignore parse errors */ }
      }

      ws.onclose = () => {
        setConnected(false)
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

  return { connected, subscribe, unsubscribe }
}

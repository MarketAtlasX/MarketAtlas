import { useEffect, useRef, useState, useCallback } from 'react'
import type { GraphUpdate } from '../types/graphTypes'

type MessageHandler = (msg: GraphUpdate) => void

export function useGraphSocket(handlers?: Record<string, MessageHandler>) {
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  const send = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }))
    }
  }, [])

  const requestForecast = useCallback((params: Record<string, unknown> = {}) => {
    send('get_forecast', params)
  }, [send])

  const requestCausal = useCallback((params: Record<string, unknown> = {}) => {
    send('get_causal', params)
  }, [send])

  const requestReasoning = useCallback((params: Record<string, unknown> = {}) => {
    send('get_reasoning', params)
  }, [send])

  const requestConfidence = useCallback((params: Record<string, unknown> = {}) => {
    send('get_confidence', params)
  }, [send])

  const requestAll = useCallback((params: Record<string, unknown> = {}) => {
    send('get_all', params)
  }, [send])

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws/graph`

    let reconnectTimer: ReturnType<typeof setTimeout>
    let closed = false

    function connect() {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'error') return
          const updateType = msg.type.replace('_update', '')
          if (updateType && handlersRef.current?.[updateType]) {
            handlersRef.current[updateType](msg as GraphUpdate)
          }
        } catch { /* ignore */ }
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

  return {
    connected,
    requestForecast,
    requestCausal,
    requestReasoning,
    requestConfidence,
    requestAll,
  }
}

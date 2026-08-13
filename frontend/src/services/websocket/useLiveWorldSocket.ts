import { useEffect, useRef } from 'react'
import { useWorldStore } from '../../stores/WorldStore'
import { countryName } from '../../stores/WorldStore'
import type { LiveEvent } from '../../types'

interface InboundMessage {
  type?: string
  event?: string
  entity?: string
  risk?: number
  symbol?: string
  direction?: 'UP' | 'DOWN'
  expected_return?: number
  confidence?: number
  source?: string
  target?: string
  influence?: number
  timestamp?: string
  title?: string
  countryCode?: string
  severity?: number
}

function connect(url: string, onMessage: (raw: string) => void): WebSocket {
  const ws = new WebSocket(url)
  ws.onmessage = e => {
    try {
      onMessage(typeof e.data === 'string' ? e.data : '')
    } catch {
      /* ignore malformed frames */
    }
  }
  return ws
}

export function useLiveWorldSocket() {
  const { pushEvent, pushRisk, pushForecast, selectEntity } = useWorldStore()
  const handlersRef = useRef({ pushEvent, pushRisk, pushForecast, selectEntity })
  handlersRef.current = { pushEvent, pushRisk, pushForecast, selectEntity }

  useEffect(() => {
    const sockets: WebSocket[] = []
    let retries = 0

    const attach = (url: string) => {
      try {
        const ws = connect(url, raw => {
          let msg: InboundMessage
          try {
            msg = JSON.parse(raw)
          } catch {
            return
          }
          const h = handlersRef.current
          const type = (msg.type || msg.event || '').toUpperCase()

          if (type.includes('RISK') || type.includes('WORLD_STATE')) {
            if (msg.entity && typeof msg.risk === 'number') {
              h.pushRisk({ entity: msg.entity, risk: msg.risk, timestamp: msg.timestamp || new Date().toISOString() })
            }
          } else if (type.includes('FORECAST') || type.includes('MARKET')) {
            if (msg.symbol && typeof msg.expected_return === 'number') {
              const ret = msg.expected_return
              h.pushForecast({
                symbol: msg.symbol,
                bullish: Math.round(ret * 100 * 1.4 * 10) / 10,
                base: Math.round(ret * 100 * 10) / 10,
                bearish: Math.round(ret * 100 * 0.4 * 10) / 10,
                confidence: Math.round((msg.confidence ?? 0.75) * 100),
              })
            }
          } else if (type.includes('GRAPH')) {
            if (msg.source && msg.target) {
              h.selectEntity(msg.source)
            }
          } else if (msg.title) {
            const ev: LiveEvent = {
              id: `ws-${Date.now()}`,
              title: msg.title,
              countryCode: msg.countryCode || 'US',
              country: countryName(msg.countryCode || 'US'),
              type: 'diplomatic',
              severity: msg.severity ?? 3,
              lat: 20,
              lng: 0,
              timestamp: msg.timestamp || new Date().toISOString(),
              summary: msg.title,
              sectors: [],
            }
            h.pushEvent(ev)
          }
        })
        sockets.push(ws)
        ws.onclose = () => {
          if (retries < 4) {
            retries += 1
            setTimeout(() => attach(url), 5000 * retries)
          }
        }
      } catch {
        /* offline-safe */
      }
    }

    attach('/ws')
    attach('/ws/graph')

    return () => {
      sockets.forEach(ws => ws.close())
    }
  }, [])
}

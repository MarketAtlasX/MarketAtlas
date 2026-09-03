/**
 * Intelligence Bus — Central event broker connecting Globe, Prediction Space, and JARVIS.
 */

export type IntelligenceEventType =
  | 'ENTITY_SELECTED'
  | 'STOCK_SELECTED'
  | 'TICKER_PREDICTED'
  | 'TICKER_REQUESTED'
  | 'ATLAS_RESPONSE'
  | 'JARVIS_RESPONSE'
  | 'CAUSAL_GRAPH_PROJECTED'
  | 'BACKTEST_REQUESTED'
  | 'GLOBE_INTENT'

export interface IntelligenceEvent<T = any> {
  type: IntelligenceEventType
  payload: T
  timestamp?: number
}

type IntelligenceSubscriber = (event: IntelligenceEvent) => void

class IntelligenceBus {
  private subscribers: Set<IntelligenceSubscriber> = new Set()
  private lastEvent: IntelligenceEvent | null = null

  public subscribe(fn: IntelligenceSubscriber): () => void {
    this.subscribers.add(fn)
    return () => this.subscribers.delete(fn)
  }

  public emit<T>(type: IntelligenceEventType, payload: T): void {
    const event: IntelligenceEvent<T> = {
      type,
      payload,
      timestamp: Date.now(),
    }
    this.lastEvent = event
    this.subscribers.forEach(sub => {
      try {
        sub(event)
      } catch (err) {
        console.error('IntelligenceBus subscriber error:', err)
      }
    })
  }

  public get current(): IntelligenceEvent | null {
    return this.lastEvent
  }
}

export const intelligenceBus = new IntelligenceBus()

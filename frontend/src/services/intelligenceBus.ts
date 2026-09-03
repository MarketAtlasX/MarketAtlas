/**
 * Intelligence Bus — Central event broker connecting Globe, Prediction Space, and JARVIS.
 */

export type IntelligenceEventType =
  | 'ENTITY_SELECTED'
  | 'STOCK_SELECTED'
  | 'TICKER_PREDICTED'
  | 'TICKER_REQUESTED'
  | 'JARVIS_RESPONSE'
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

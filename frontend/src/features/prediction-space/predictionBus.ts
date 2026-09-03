/**
 * Prediction Bus — Event broker specifically for Prediction Space lifecycles.
 */

import type { PredictionResult } from '../../api/client'

export type PredictionEventType = 'PREDICTION_LOADED' | 'TICKER_SELECTED'

export interface PredictionEvent {
  type: PredictionEventType
  ticker: string
  prediction?: PredictionResult
  timestamp: number
}

type PredictionSubscriber = (event: PredictionEvent) => void

class PredictionBus {
  private subscribers: Set<PredictionSubscriber> = new Set()
  private lastEvent: PredictionEvent | null = null

  public subscribe(fn: PredictionSubscriber): () => void {
    this.subscribers.add(fn)
    return () => this.subscribers.delete(fn)
  }

  public emit(type: PredictionEventType, ticker: string, prediction?: PredictionResult): void {
    const event: PredictionEvent = {
      type,
      ticker,
      prediction,
      timestamp: Date.now(),
    }
    this.lastEvent = event
    this.subscribers.forEach(sub => {
      try {
        sub(event)
      } catch (err) {
        console.error('PredictionBus subscriber error:', err)
      }
    })
  }

  public get current(): PredictionEvent | null {
    return this.lastEvent
  }
}

export const predictionBus = new PredictionBus()

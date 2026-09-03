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

/**
 * Prediction Bus — Event broker specifically for Prediction Space lifecycles.
 */

import type { PredictionResult } from '../../api/client'

export type PredictionEventType = 'PREDICTION_LOADED' | 'TICKER_SELECTED'

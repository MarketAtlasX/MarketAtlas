/**
 * Prediction API wrapper for the Prediction Space.
 */

import { getPrediction, type PredictionResult, type PredictionOptions } from '../../api/client'

function rand(min: number, max: number) {
  return +(min + Math.random() * (max - min)).toFixed(4)
}

const DIRECTIONS = ['BULLISH', 'BEARISH', 'NEUTRAL', 'VOLATILE'] as const

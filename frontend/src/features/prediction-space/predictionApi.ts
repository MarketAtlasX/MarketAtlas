/**
 * Prediction API wrapper for the Prediction Space.
 *
 * Calls getPrediction() with include_raw=true so the UI can display
 * individual agent confidence scores.  Errors propagate to the caller so the
 * UI shows a genuine failure state — predictions are never silently replaced
 * with generated mock data.
 */

import { getPrediction, type PredictionResult, type PredictionOptions } from '../../api/client'

// ── Public API ───────────────────────────────────────────────────────────────

export async function fetchPrediction(
  ticker: string,
  opts?: PredictionOptions,
): Promise<PredictionResult> {
  const mergedOpts: PredictionOptions = {
    timeHorizon: 'medium_term',
    includeRaw: true,
    ...opts,
  }

  try {
    return await getPrediction(ticker, mergedOpts)
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'AI forecast unavailable')
  }
}

import { useCallback, useEffect, useRef } from 'react'
import { EMPTY_EVIDENCE_STATE, useAtlasStore } from '../../stores/AtlasStore'
import { fetchEvidenceObservation, summarizeEvidence } from '../../api/evidenceApi'
import type { EvidenceObservation } from '../../api/evidenceApi'

export interface UseEvidenceSelectionOptions {
  /**
   * Poll interval (ms) used to refresh the current observation in place.
   * `0` disables automatic refresh. Defaults to 20s.
   */
  refreshIntervalMs?: number
}

export interface EvidenceSelectionHandle {
  /** Refresh the current observation in place, preserving the selection. */
  refresh: () => void
}

const DEFAULT_REFRESH_INTERVAL_MS = 20000

/**
 * Load and keep the canonical evidence observation for the current globe
 * selection up to date.
 *
 * This is the only evidence fetch path. It fetches `GET /live-events/observation`
 * and stores the result in `AtlasStore.evidence`, which the Evidence panel and
 * the globe overlay both read.
 *
 * Behaviour:
 * - Fetches only for a committed, non-empty selection (never on hover).
 * - A new selection shows a loading state and never displays the previous
 *   entity's observation.
 * - A refresh of the *same* selection keeps the current observation visible and
 *   flags `refreshing` instead of resetting the panel/globe.
 * - Drops late responses via a generation counter, so a slow request for a
 *   previous selection can never overwrite a newer one.
 * - On a failed refresh, keeps the last good observation rather than clearing it
 *   or fabricating an update.
 */
export function useEvidenceSelection(
  selection: string | null,
  options: UseEvidenceSelectionOptions = {},
): EvidenceSelectionHandle {
  const refreshIntervalMs = options.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS
  const { state, update } = useAtlasStore()

  const evidenceRef = useRef(state.evidence)
  evidenceRef.current = state.evidence

  const generationRef = useRef(0)
  const requestSeqRef = useRef(0)
  const controllerRef = useRef<AbortController | null>(null)
  const timerRef = useRef<number | null>(null)

  const runRequest = useCallback(
    (key: string, mode: 'initial' | 'refresh') => {
      if (!key) return
      const requestId = ++requestSeqRef.current
      const generation = generationRef.current
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller

      if (mode === 'initial') {
        // A new selection starts clean: the previous entity's summary must not
        // survive into the loading state.
        update({ evidence: { selection: key, status: 'loading', observation: null, error: null, refreshing: false, lastUpdatedAt: null }, latestEvidence: null })
      } else {
        // Preserve the current observation while refreshing the same selection.
        update({ evidence: { ...evidenceRef.current, refreshing: true } })
      }

      fetchEvidenceObservation({ query: key, signal: controller.signal })
        .then((observation: EvidenceObservation) => {
          if (generation !== generationRef.current || requestId !== requestSeqRef.current) return
          update({
            evidence: {
              selection: key,
              status: 'ready',
              observation,
              error: null,
              refreshing: false,
              lastUpdatedAt: new Date().toISOString(),
            },
            latestEvidence: summarizeEvidence(observation),
          })
        })
        .catch(error => {
          if (generation !== generationRef.current || requestId !== requestSeqRef.current || controller.signal.aborted) return
          const message = error instanceof Error ? error.message : 'Evidence service unavailable'
          if (mode === 'initial') {
            update({ evidence: { selection: key, status: 'error', observation: null, error: message, refreshing: false, lastUpdatedAt: null }, latestEvidence: null })
          } else {
            // Keep the last good observation; surface the refresh failure only.
            update({ evidence: { ...evidenceRef.current, refreshing: false, error: message } })
          }
        })
    },
    [update],
  )

  useEffect(() => {
    const key = selection?.trim() ? selection.trim() : null

    if (!key) {
      generationRef.current += 1
      requestSeqRef.current += 1
      controllerRef.current?.abort()
      controllerRef.current = null
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
      const current = evidenceRef.current
      if (current.selection !== null || current.status !== 'idle' || current.observation !== null) {
        update({ evidence: { ...EMPTY_EVIDENCE_STATE }, latestEvidence: null })
      }
      return
    }

    // Initial load only when this selection is not already shown.
    if (evidenceRef.current.selection !== key || evidenceRef.current.status === 'error' || evidenceRef.current.status === 'idle') {
      generationRef.current += 1
      runRequest(key, 'initial')
    }

    if (refreshIntervalMs > 0) {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
      timerRef.current = window.setInterval(() => {
        const currentKey = evidenceRef.current.selection
        if (currentKey) runRequest(currentKey, 'refresh')
      }, refreshIntervalMs)
    }

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [selection, refreshIntervalMs, runRequest, update])

  const refresh = useCallback(() => {
    const key = evidenceRef.current.selection
    if (key) runRequest(key, 'refresh')
  }, [runRequest])

  return { refresh }
}

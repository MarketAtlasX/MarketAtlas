import { useCallback } from 'react'
import { useAtlasStore } from '../../stores/AtlasStore'
import { eventAffectsSelection } from '../../services/websocket/useLiveWorldSocket'
import {
  useEvidenceSelection,
  type EvidenceSelectionHandle,
  type UseEvidenceSelectionOptions,
} from './useEvidenceSelection'
import type { LiveEvent } from '../../types'

export type LiveEvidenceRefreshHandle = EvidenceSelectionHandle & {
  /** Feed each validated WebSocket event here; affected selections refresh. */
  onLiveEvent: (event: LiveEvent) => void
}

/**
 * Connects the existing live-event WebSocket stream to the canonical evidence
 * lifecycle without a second fetch path: `useEvidenceSelection` remains the
 * only observer of the selection, and `onLiveEvent` merely triggers its
 * in-place `refresh()` when a genuinely new backend event affects the entity
 * whose evidence is currently displayed.
 *
 * Guards:
 * - no selection → nothing to refresh;
 * - evidence not ready for this selection (loading/error/another entity) →
 *   never refreshes, so a previous entity's evidence is never touched;
 * - the event must match the selection through backend-provided facts
 *   (`eventAffectsSelection`).
 */
export function useLiveEvidenceRefresh(
  selection: string | null,
  options: UseEvidenceSelectionOptions = {},
): LiveEvidenceRefreshHandle {
  const { refresh } = useEvidenceSelection(selection, options)
  const { state } = useAtlasStore()

  const onLiveEvent = useCallback(
    (event: LiveEvent) => {
      if (!selection) return
      if (state.evidence.selection !== selection || state.evidence.status !== 'ready') return
      if (!eventAffectsSelection(event, selection)) return
      refresh()
    },
    [selection, state.evidence.selection, state.evidence.status, refresh],
  )

  return { refresh, onLiveEvent }
}

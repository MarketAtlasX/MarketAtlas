import {
  Activity,
  AlertTriangle,
  Ban,
  FlaskConical,
  History,
  type LucideIcon,
} from 'lucide-react'
import type { ObservationStatus } from '../../api/evidenceApi'

export type EvidenceTone = 'accent' | 'positive' | 'warning' | 'critical' | 'neutral'

export interface EvidenceStatusMeta {
  label: string
  /** Short plain-language meaning shown alongside the label. */
  meaning: string
  tone: EvidenceTone
  icon: LucideIcon
}

/**
 * Single source of truth for how each canonical observation status is
 * presented. Status is always conveyed with an icon, a label, and a
 * description — never by color alone.
 */
export const EVIDENCE_STATUS_META: Record<ObservationStatus, EvidenceStatusMeta> = {
  live: {
    label: 'LIVE',
    meaning: 'Provider-backed and current',
    tone: 'positive',
    icon: Activity,
  },
  stale: {
    label: 'STALE',
    meaning: 'Provider-backed but past freshness window',
    tone: 'warning',
    icon: History,
  },
  degraded: {
    label: 'DEGRADED',
    meaning: 'Partial or inferred evidence only',
    tone: 'warning',
    icon: AlertTriangle,
  },
  unavailable: {
    label: 'UNAVAILABLE',
    meaning: 'No provider-backed evidence found',
    tone: 'neutral',
    icon: Ban,
  },
  demo: {
    label: 'DEMO',
    meaning: 'Sample data — not provider-backed',
    tone: 'accent',
    icon: FlaskConical,
  },
}

const FALLBACK_META: EvidenceStatusMeta = {
  label: 'UNKNOWN',
  meaning: 'Unrecognized evidence status',
  tone: 'neutral',
  icon: AlertTriangle,
}

export function evidenceStatusMeta(status: string | null | undefined): EvidenceStatusMeta {
  if (status && status in EVIDENCE_STATUS_META) {
    return EVIDENCE_STATUS_META[status as ObservationStatus]
  }
  return FALLBACK_META
}

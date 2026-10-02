import Badge from '../../components/ui/Badge'
import { evidenceStatusMeta, type EvidenceStatusMeta } from './evidenceStatus'

interface EvidenceStatusBadgeProps {
  status?: string | null
  /** Pre-resolved metadata (e.g. a market-observation status). */
  meta?: EvidenceStatusMeta
  /** Render the plain-language meaning next to the status label. */
  showMeaning?: boolean
  className?: string
}

/**
 * Textual + iconic evidence status chip. Color is supplementary; the label and
 * icon always communicate the state on their own.
 */
export default function EvidenceStatusBadge({ status, meta: providedMeta, showMeaning = false, className = '' }: EvidenceStatusBadgeProps) {
  const meta = providedMeta ?? evidenceStatusMeta(status)
  const Icon = meta.icon
  return (
    <Badge tone={meta.tone} className={className}>
      <Icon size={11} aria-hidden="true" />
      <span className="font-semibold tracking-wider">{meta.label}</span>
      {showMeaning && <span className="opacity-70">· {meta.meaning}</span>}
    </Badge>
  )
}

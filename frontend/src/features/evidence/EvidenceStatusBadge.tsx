import Badge from '../../components/ui/Badge'
import { evidenceStatusMeta } from './evidenceStatus'

interface EvidenceStatusBadgeProps {
  status: string | null | undefined
  /** Render the plain-language meaning next to the status label. */
  showMeaning?: boolean
  className?: string
}

/**
 * Textual + iconic evidence status chip. Color is supplementary; the label and
 * icon always communicate the state on their own.
 */
export default function EvidenceStatusBadge({ status, showMeaning = false, className = '' }: EvidenceStatusBadgeProps) {
  const meta = evidenceStatusMeta(status)
  const Icon = meta.icon
  return (
    <Badge tone={meta.tone} className={className}>
      <Icon size={11} aria-hidden="true" />
      <span className="font-semibold tracking-wider">{meta.label}</span>
      {showMeaning && <span className="opacity-70">· {meta.meaning}</span>}
    </Badge>
  )
}

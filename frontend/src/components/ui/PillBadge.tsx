export type BadgeVariant = 'cyan' | 'green' | 'red' | 'amber' | 'neutral'

export interface PillBadgeProps {
  label: string
  variant?: BadgeVariant
  className?: string
}

export default function PillBadge({ label, variant = 'neutral', className = '' }: PillBadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    cyan: 'border-[rgba(56,232,255,0.3)] bg-[rgba(56,232,255,0.08)] text-[var(--accent)]',
    green: 'border-[rgba(46,230,168,0.3)] bg-[rgba(46,230,168,0.08)] text-[var(--bull)]',
    red: 'border-[rgba(255,77,94,0.3)] bg-[rgba(255,77,94,0.08)] text-[var(--bear)]',
    amber: 'border-[rgba(255,213,74,0.3)] bg-[rgba(255,213,74,0.08)] text-[var(--amber)]',
    neutral: 'border-[var(--line)] bg-[rgba(255,255,255,0.03)] text-[var(--text-mid)]',
  }

  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-mono border ${variantStyles[variant]} ${className}`}>
      {label}
    </span>
  )
}

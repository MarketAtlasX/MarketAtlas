import type { ReactNode } from 'react'

type Tone = 'accent' | 'positive' | 'warning' | 'critical' | 'neutral'

const TONES: Record<Tone, string> = {
  accent: 'text-[var(--accent)] border-[rgba(56,232,255,0.35)] bg-[rgba(56,232,255,0.1)]',
  positive: 'text-[var(--positive)] border-[rgba(46,230,168,0.35)] bg-[rgba(46,230,168,0.08)]',
  warning: 'text-[var(--warning)] border-[rgba(245,185,65,0.35)] bg-[rgba(245,185,65,0.08)]',
  critical: 'text-[var(--critical)] border-[rgba(255,77,94,0.35)] bg-[rgba(255,77,94,0.08)]',
  neutral: 'text-[var(--text-mid)] border-[var(--line)] bg-[rgba(95,125,153,0.08)]',
}

interface BadgeProps {
  tone?: Tone
  children: ReactNode
  className?: string
}

export default function Badge({ tone = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border ${TONES[tone]} ${className}`}>
      {children}
    </span>
  )
}

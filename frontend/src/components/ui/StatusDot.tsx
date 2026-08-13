interface StatusDotProps {
  tone?: 'positive' | 'warning' | 'critical' | 'accent' | 'neutral'
  pulse?: boolean
}

const COLORS: Record<string, string> = {
  positive: 'var(--positive)',
  warning: 'var(--warning)',
  critical: 'var(--critical)',
  accent: 'var(--accent)',
  neutral: 'var(--text-lo)',
}

export default function StatusDot({ tone = 'accent', pulse = true }: StatusDotProps) {
  const color = COLORS[tone]
  return (
    <span className="relative inline-flex h-2 w-2">
      {pulse && (
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-40"
          style={{ background: color, boxShadow: `0 0 8px ${color}` }}
        />
      )}
      <span
        className={`relative inline-flex rounded-full h-2 w-2 ${pulse ? 'pulse-dot' : ''}`}
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      />
    </span>
  )
}

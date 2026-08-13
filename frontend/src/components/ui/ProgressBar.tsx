import { riskColor } from '../../stores/WorldStore'

interface ProgressBarProps {
  value: number
  max?: number
  color?: string
  className?: string
  shimmer?: boolean
}

export default function ProgressBar({ value, max = 100, color, className = '', shimmer }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const fill = color ?? riskColor(value)
  return (
    <div className={`h-1.5 w-full rounded-full bg-[rgba(95,125,153,0.12)] overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-700 ${shimmer ? 'shimmer-bar' : ''}`}
        style={{ width: `${pct}%`, background: shimmer ? undefined : fill, boxShadow: `0 0 8px ${fill}55` }}
      />
    </div>
  )
}

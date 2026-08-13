import { riskColor } from '../../stores/WorldStore'

interface GaugeProps {
  value: number
  max?: number
  label?: string
  sub?: string
  color?: string
  size?: number
}

export default function Gauge({ value, max = 100, label, sub, color, size = 84 }: GaugeProps) {
  const pct = Math.min(1, Math.max(0, value / max))
  const c = color ?? riskColor(value)
  const r = size / 2 - 5
  const circ = 2 * Math.PI * r
  const dash = circ * pct

  return (
    <div className="flex flex-col items-center gap-1.5" style={{ width: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(95,125,153,0.15)" strokeWidth={5} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={c}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`}
            style={{ transition: 'stroke-dasharray 0.7s ease', filter: `drop-shadow(0 0 6px ${c})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-lg font-semibold leading-none" style={{ color: c }}>
            {Math.round(value)}
          </span>
          {sub && <span className="text-[8px] uppercase tracking-wider text-[var(--text-lo)] mt-0.5">{sub}</span>}
        </div>
      </div>
      {label && <span className="text-[10px] font-medium text-[var(--text-mid)]">{label}</span>}
    </div>
  )
}

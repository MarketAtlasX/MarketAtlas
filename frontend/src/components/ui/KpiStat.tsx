import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'

export interface KpiStatProps {
  label: string
  value: string | number
  delta?: number
  deltaSuffix?: string
  sublabel?: string
}

export default function KpiStat({ label, value, delta, deltaSuffix = '%', sublabel }: KpiStatProps) {
  const isPositive = delta !== undefined && delta > 0
  const isNegative = delta !== undefined && delta < 0

  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--text-lo)]">{label}</span>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-lg font-mono font-semibold text-[var(--text-hi)]">{value}</span>
        {delta !== undefined && (
          <span
            className={`inline-flex items-center text-[10px] font-mono font-medium ${
              isPositive ? 'text-[var(--bull)]' : isNegative ? 'text-[var(--bear)]' : 'text-[var(--text-mid)]'
            }`}
          >
            {isPositive ? <ArrowUpRight size={11} /> : isNegative ? <ArrowDownRight size={11} /> : <Minus size={11} />}
            {delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)}
            {deltaSuffix}
          </span>
        )}
      </div>
      {sublabel && <span className="text-[9px] text-[var(--text-lo)] mt-0.5">{sublabel}</span>}
    </div>
  )
}

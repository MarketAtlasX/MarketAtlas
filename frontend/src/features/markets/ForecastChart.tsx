import { useMemo } from 'react'

interface ForecastChartProps {
  symbol: string
  history: number[]
  bull: number[]
  base: number[]
  bear: number[]
  width?: number
  height?: number
}

function mulberry(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generateSymbolData(symbol: string): { history: number[]; bull: number[]; base: number[]; bear: number[]; price: number } {
  const rand = mulberry(symbol.split('').reduce((s, c) => s + c.charCodeAt(0), 0) + 42)
  const basePrice = 120 + rand() * 120
  const hist: number[] = []
  let p = basePrice
  for (let i = 0; i < 78; i++) {
    p = Math.max(40, p + (rand() - 0.48) * 4)
    hist.push(p)
  }
  const last = hist[hist.length - 1]
  const drift = rand() * 0.5 - 0.1
  const bullA: number[] = []
  const baseA: number[] = []
  const bearA: number[] = []
  let b = last, bs = last, br = last
  for (let i = 0; i < 30; i++) {
    b += (rand() - 0.42) * 3.2 + drift
    bs += (rand() - 0.5) * 1.4
    br += (rand() - 0.58) * 3.4 - drift * 0.6
    bullA.push(b)
    baseA.push(bs)
    bearA.push(br)
  }
  return { history: hist, bull: bullA, base: baseA, bear: bearA, price: last }
}

export default function ForecastChart({ symbol, history, bull, base, bear, width = 640, height = 260 }: ForecastChartProps) {
  const geom = useMemo(() => {
    const all = [...history, ...base]
    const min = Math.min(...all, ...bull, ...bear) * 0.985
    const max = Math.max(...all, ...bull, ...bear) * 1.015
    const range = max - min || 1
    const n = history.length + base.length
    const stepX = width / n
    const x = (i: number) => i * stepX + 2
    const y = (v: number) => height - 14 - ((v - min) / range) * (height - 34)
    const line = (arr: number[], offset = 0) =>
      arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(offset + i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
    return { x, y, n, historyN: history.length, line }
  }, [history, base, bull, bear, width, height])

  const nowX = geom.x(geom.historyN - 1)
  const endX = geom.x(geom.n - 1)

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
      <defs>
        <linearGradient id={`band-${symbol}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(56,232,255,0.16)" />
          <stop offset="100%" stopColor="rgba(56,232,255,0.02)" />
        </linearGradient>
        <linearGradient id={`area-${symbol}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(56,232,255,0.25)" />
          <stop offset="100%" stopColor="rgba(56,232,255,0)" />
        </linearGradient>
      </defs>

      {[0.2, 0.4, 0.6, 0.8].map(t => (
        <line key={t} x1={0} x2={width} y1={height * t} y2={height * t} stroke="rgba(84,128,158,0.08)" strokeWidth={1} />
      ))}

      <path
        d={`${geom.line(bear, geom.historyN)} L${endX},${geom.y(bear[bear.length - 1])} L${geom.x(geom.historyN)},${geom.y(bull[0])} L${geom.x(geom.historyN)},${geom.y(bull[0])} ${geom.line(bull, geom.historyN).replace('M', 'L')} Z`}
        fill={`url(#band-${symbol})`}
      />

      <path d={`${geom.line(history)} L${nowX},${height - 10} L${geom.x(0)},${height - 10} Z`} fill={`url(#area-${symbol})`} />

      <path d={geom.line(bull, geom.historyN)} fill="none" stroke="#2ee6a8" strokeWidth={1.2} strokeDasharray="3 4" opacity={0.85} />
      <path d={geom.line(bear, geom.historyN)} fill="none" stroke="#ff4d5e" strokeWidth={1.2} strokeDasharray="3 4" opacity={0.85} />
      <path d={geom.line(history)} fill="none" stroke="#38e8ff" strokeWidth={1.8} style={{ filter: 'drop-shadow(0 0 5px rgba(56,232,255,0.5))' }} />
      <path d={geom.line(base, geom.historyN)} fill="none" stroke="#f5b941" strokeWidth={1.6} strokeDasharray="6 5" />

      <line x1={nowX} x2={nowX} y1={6} y2={height - 8} stroke="rgba(230,241,248,0.4)" strokeWidth={1} strokeDasharray="3 3" />
      <text x={nowX} y={height - 2} textAnchor="middle" fill="var(--text-mid)" fontSize={9} fontFamily="var(--font-mono)">
        NOW
      </text>
      <text x={6} y={height - 2} textAnchor="start" fill="var(--text-lo)" fontSize={9} fontFamily="var(--font-mono)">
        PAST
      </text>
      <text x={endX} y={height - 2} textAnchor="end" fill="var(--accent)" fontSize={9} fontFamily="var(--font-mono)">
        +30D
      </text>

      <text x={width - 8} y={12} textAnchor="end" fill="var(--positive)" fontSize={9} fontFamily="var(--font-mono)">bull</text>
      <text x={width - 8} y={24} textAnchor="end" fill="#f5b941" fontSize={9} fontFamily="var(--font-mono)">base</text>
      <text x={width - 8} y={36} textAnchor="end" fill="var(--critical)" fontSize={9} fontFamily="var(--font-mono)">bear</text>
    </svg>
  )
}

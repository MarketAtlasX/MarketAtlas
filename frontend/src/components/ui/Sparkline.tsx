import { useMemo } from 'react'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  stroke?: string
  fill?: string
  className?: string
}

export default function Sparkline({ data, width = 120, height = 32, stroke = 'var(--accent)', fill, className = '' }: SparklineProps) {
  const path = useMemo(() => {
    if (data.length < 2) return ''
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const stepX = width / (data.length - 1)
    const pts = data.map((v, i) => [i * stepX, height - 3 - ((v - min) / range) * (height - 6)])
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
    return d
  }, [data, width, height])

  if (data.length < 2) return <div className={`${className}`} style={{ width, height }} />

  const areaId = useMemo(() => `spark-${stroke.replace(/[^a-z0-9]/gi, '')}`, [stroke])

  return (
    <svg width={width} height={height} className={className}>
      {fill && (
        <>
          <defs>
            <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fill} stopOpacity={0.35} />
              <stop offset="100%" stopColor={fill} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={`${path} L${width},${height} L0,${height} Z`} fill={`url(#${areaId})`} />
        </>
      )}
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

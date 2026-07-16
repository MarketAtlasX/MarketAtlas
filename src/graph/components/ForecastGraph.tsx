import { useEffect, useRef, useMemo } from 'react'
import * as d3 from 'd3'
import type { ForecastGraph } from '../types/graphTypes'

interface Props {
  data: ForecastGraph | null
  width?: number
  height?: number
}

export default function ForecastGraph({ data, width = 500, height = 300 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  const { historical, predicted, current_price, symbol } = data ?? {}
  const allPoints = useMemo(() => {
    if (!historical || !predicted) return []
    return [
      ...historical.map(p => ({ ...p, phase: 'historical' as const })),
      ...predicted.map(p => ({ ...p, phase: 'predicted' as const })),
    ]
  }, [historical, predicted])

  useEffect(() => {
    if (!svgRef.current || allPoints.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin = { top: 20, right: 20, bottom: 30, left: 50 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const xExtent = d3.extent(allPoints, d => d.day) as [number, number]
    const yMin = d3.min(allPoints, d => d.lower) ?? 0
    const yMax = d3.max(allPoints, d => d.upper) ?? 0

    const x = d3.scaleLinear().domain(xExtent).range([0, innerWidth])
    const y = d3.scaleLinear().domain([yMin * 0.95, yMax * 1.05]).range([innerHeight, 0])

    const splitDay = historical?.length ? -(historical[historical.length - 1]?.day ?? 0) : 0

    const areaGen = d3.area<typeof allPoints[0]>()
      .x(d => x(d.day))
      .y0(d => y(d.lower))
      .y1(d => y(d.upper))

    const forecastPoints = allPoints.filter(d => d.phase === 'predicted')
    if (forecastPoints.length > 0) {
      g.append('path')
        .datum(forecastPoints)
        .attr('fill', 'url(#confidenceGrad)')
        .attr('opacity', 0.2)
        .attr('d', areaGen as any)
    }

    const line = d3.line<typeof allPoints[0]>()
      .x(d => x(d.day))
      .y(d => y(d.value))

    g.append('path')
      .datum(allPoints.filter(d => d.phase === 'historical'))
      .attr('fill', 'none')
      .attr('stroke', '#6366f1')
      .attr('stroke-width', 2)
      .attr('d', line)

    g.append('path')
      .datum(forecastPoints)
      .attr('fill', 'none')
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '6,3')
      .attr('d', line)

    g.append('line')
      .attr('x1', x(0))
      .attr('y1', 0)
      .attr('x2', x(0))
      .attr('y2', innerHeight)
      .attr('stroke', '#64748b')
      .attr('stroke-dasharray', '4,4')
      .attr('stroke-width', 1)

    g.append('text')
      .attr('x', x(0))
      .attr('y', -8)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', 10)
      .text('Today')

    g.selectAll('.dot-historical')
      .data(allPoints.filter(d => d.phase === 'historical'))
      .enter()
      .append('circle')
      .attr('cx', d => x(d.day))
      .attr('cy', d => y(d.value))
      .attr('r', 2)
      .attr('fill', '#6366f1')
      .attr('opacity', 0.6)

    g.selectAll('.dot-forecast')
      .data(forecastPoints)
      .enter()
      .append('circle')
      .attr('cx', d => x(d.day))
      .attr('cy', d => y(d.value))
      .attr('r', 3)
      .attr('fill', '#f59e0b')
      .attr('opacity', 0.8)

    g.append('text')
      .attr('x', innerWidth - 80)
      .attr('y', 12)
      .attr('fill', '#6366f1')
      .attr('font-size', 10)
      .text('Historical')

    g.append('text')
      .attr('x', innerWidth - 80)
      .attr('y', 24)
      .attr('fill', '#f59e0b')
      .attr('font-size', 10)
      .text('Forecast')

    const xAxis = d3.axisBottom(x).ticks(6).tickFormat(d => `${d}d`)
    const yAxis = d3.axisLeft(y).ticks(5).tickFormat(d => `$${d}`)

    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', '#94a3b8')

    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', '#94a3b8')

    svg.append('defs')
      .append('linearGradient')
      .attr('id', 'confidenceGrad')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%')
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#f59e0b')
      .attr('stop-opacity', 0.3)

  }, [allPoints, width, height])

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        <div className="flex flex-col items-center gap-2">
          <svg className="animate-spin h-6 w-6 text-indigo-400" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>No forecast data available</span>
        </div>
      </div>
    )
  }

  const changePct = historical && historical.length > 1
    ? ((current_price! - historical[historical.length - 1].value) / historical[historical.length - 1].value * 100).toFixed(2)
    : null

  return (
    <div className="w-full h-full">
      <div className="flex items-center justify-between px-2 mb-1">
        <span className="text-xs font-medium text-gray-400">{symbol} Price Forecast</span>
        <div className="flex items-center gap-2">
          {changePct && (
            <span className={`text-xs font-mono ${Number(changePct) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {Number(changePct) >= 0 ? '+' : ''}{changePct}%
            </span>
          )}
          <span className="text-lg font-bold text-indigo-400">${current_price?.toFixed(2)}</span>
        </div>
      </div>
      <svg ref={svgRef} width={width} height={height} className="w-full" />
    </div>
  )
}

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { ConfidenceGraph } from '../types/graphTypes'

interface Props {
  data: ConfidenceGraph | null
  width?: number
  height?: number
}

export default function ConfidenceGraph({ data, width = 500, height = 300 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !data?.factors) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin = { top: 30, right: 20, bottom: 40, left: 120 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const factors = data.factors
    const barHeight = 24
    const gap = 8
    const totalHeight = factors.length * (barHeight + gap)
    const chartHeight = Math.max(innerHeight, totalHeight)

    const xScale = d3.scaleLinear().domain([0, 1]).range([0, innerWidth])

    const colorScale = d3.scaleLinear<string>()
      .domain([0, 0.4, 0.7, 1])
      .range(['#ef4444', '#f59e0b', '#84cc16', '#22c55e'])

    const bars = g.selectAll('.bar-group')
      .data(factors)
      .enter()
      .append('g')
      .attr('class', 'bar-group')
      .attr('transform', (_, i) => `translate(0, ${i * (barHeight + gap)})`)

    bars.append('text')
      .attr('x', -8)
      .attr('y', barHeight / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', 11)
      .text(d => d.name)

    bars.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', innerWidth)
      .attr('height', barHeight)
      .attr('rx', 4)
      .attr('fill', '#1e293b')
      .attr('opacity', 0.5)

    bars.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', d => xScale(d.value))
      .attr('height', barHeight)
      .attr('rx', 4)
      .attr('fill', d => colorScale(d.value))
      .attr('opacity', 0.8)
      .transition()
      .duration(800)
      .delay((_, i) => i * 100)
      .attr('width', d => xScale(d.value))

    bars.append('text')
      .attr('x', d => xScale(d.value) + 4)
      .attr('y', barHeight / 2)
      .attr('dominant-baseline', 'middle')
      .attr('fill', d => (d.value > 0.5 ? '#fff' : '#94a3b8'))
      .attr('font-size', 10)
      .attr('font-family', 'monospace')
      .text(d => `${(d.value * 100).toFixed(0)}%`)

    const overall = data.overall_confidence ?? 0
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', -12)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', 10)
      .text('Confidence Breakdown')

    svg.append('defs')
      .append('linearGradient')
      .attr('id', 'confGrad')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '0%')
      .selectAll('stop')
      .data([
        { offset: '0%', color: '#ef4444' },
        { offset: '40%', color: '#f59e0b' },
        { offset: '70%', color: '#84cc16' },
        { offset: '100%', color: '#22c55e' },
      ])
      .enter()
      .append('stop')
      .attr('offset', d => d.offset)
      .attr('stop-color', d => d.color)

  }, [data, width, height])

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        <div className="flex flex-col items-center gap-2">
          <svg className="animate-spin h-6 w-6 text-indigo-400" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>No confidence data available</span>
        </div>
      </div>
    )
  }

  const overallConfidence = data.overall_confidence ?? 0
  const confColor = overallConfidence > 0.7 ? '#22c55e' : overallConfidence > 0.4 ? '#f59e0b' : '#ef4444'

  return (
    <div className="w-full h-full">
      <div className="flex items-center justify-between px-2 mb-2">
        <span className="text-xs font-medium text-gray-400">Overall Confidence</span>
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-24 rounded-full bg-gray-700 overflow-hidden"
          >
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${overallConfidence * 100}%`,
                background: confColor,
              }}
            />
          </div>
          <span className="text-lg font-bold" style={{ color: confColor }}>
            {(overallConfidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>
      <svg ref={svgRef} width={width} height={height} className="w-full" />
    </div>
  )
}

import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts'
import type { HorizonResult } from '../types'

interface TimelineProps {
  horizonResults: Record<string, HorizonResult>
}

export default function Timeline({ horizonResults }: TimelineProps) {
  const chartData = useMemo(() => {
    return Object.entries(horizonResults)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([days, result]) => ({
        days: Number(days),
        confidence: result.confidence,
        uncertainty: result.uncertainty,
        risk: Object.values(result.risk_scores).reduce((s, v) => s + v, 0) / Math.max(Object.keys(result.risk_scores).length, 1),
        oil: result.market_impact.oil_price || 0,
        vix: result.market_impact.vix_forecast || 0,
      }))
  }, [horizonResults])

  const timelineSteps = useMemo(() => {
    return Object.entries(horizonResults)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([days, result]) => ({
        days: Number(days),
        confidence: result.confidence,
        summary: `T+${days}d - Confidence: ${(result.confidence * 100).toFixed(0)}%`,
      }))
  }, [horizonResults])

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Simulation Timeline</h3>

      <div className="bg-gray-900 rounded-lg p-4">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="days" stroke="#9CA3AF" label={{ value: 'Days', position: 'bottom', fill: '#9CA3AF' }} />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#F9FAFB' }}
            />
            <Legend />
            <Line type="monotone" dataKey="confidence" stroke="#3B82F6" name="Confidence" dot={false} />
            <Line type="monotone" dataKey="uncertainty" stroke="#EF4444" name="Uncertainty" dot={false} />
            <Line type="monotone" dataKey="risk" stroke="#F59E0B" name="Avg Risk" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="relative">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-700" />
        <div className="flex overflow-x-auto gap-0 py-4">
          {timelineSteps.map((step, i) => (
            <div key={step.days} className="flex items-center min-w-[100px]">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full ${step.confidence > 0.6 ? 'bg-green-500' : step.confidence > 0.4 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                <span className="text-xs text-gray-400 mt-1">T+{step.days}d</span>
                <span className="text-[10px] text-gray-500">{(step.confidence * 100).toFixed(0)}%</span>
              </div>
              {i < timelineSteps.length - 1 && (
                <div className="h-0.5 flex-1 bg-gray-700 mx-2" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

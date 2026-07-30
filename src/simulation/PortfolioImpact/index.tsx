import { useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import type { PortfolioSummary, ImpactMetric } from '../types'

interface PortfolioImpactProps {
  data: PortfolioSummary | null
}

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

export default function PortfolioImpact({ data }: PortfolioImpactProps) {
  const pieData = useMemo(() => {
    if (!data?.impacts) return []
    return data.impacts
      .filter(i => i.name.startsWith('sector_'))
      .map(i => ({
        name: i.name.replace('sector_', '').replace(/_/g, ' '),
        value: Math.abs(i.value) * 100,
        direction: i.direction,
      }))
  }, [data])

  const barData = useMemo(() => {
    if (!data?.impacts) return []
    return data.impacts.slice(0, 6).map(i => ({
      name: i.name.replace(/_/g, ' ').substring(0, 20),
      value: i.value * 100,
      fill: i.value > 0 ? '#10B981' : '#EF4444',
    }))
  }, [data])

  if (!data) {
    return (
      <div className="text-gray-500 text-sm p-4 text-center">
        No portfolio impact data available.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Portfolio Impact</h3>

      {data.summary && (
        <p className="text-sm text-gray-400">{data.summary}</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 rounded-lg p-4">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%` as never}
                labelLine={false}
              >
                {pieData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 rounded-lg p-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {data.risks && data.risks.length > 0 && (
          <div className="bg-gray-900 rounded-lg p-3">
            <span className="text-xs text-red-400 font-medium">Risks</span>
            <ul className="mt-1 space-y-0.5">
              {data.risks.slice(0, 4).map((r, i) => (
                <li key={i} className="text-xs text-gray-500">{r}</li>
              ))}
            </ul>
          </div>
        )}
        {data.opportunities && data.opportunities.length > 0 && (
          <div className="bg-gray-900 rounded-lg p-3">
            <span className="text-xs text-green-400 font-medium">Opportunities</span>
            <ul className="mt-1 space-y-0.5">
              {data.opportunities.slice(0, 4).map((o, i) => (
                <li key={i} className="text-xs text-gray-500">{o}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

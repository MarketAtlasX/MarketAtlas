import { useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import type { PortfolioImpact } from '../types'

interface PortfolioImpactProps {
  data: PortfolioImpact | null
}

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

export default function PortfolioImpact({ data }: PortfolioImpactProps) {
  const pieData = useMemo(() => {
    if (!data?.sector_contributions) return []
    return Object.entries(data.sector_contributions)
      .map(([sector, c]) => ({
        name: sector.replace(/_/g, ' '),
        value: c.allocation * 100,
      }))
  }, [data])

  const barData = useMemo(() => {
    if (!data?.sector_contributions) return []
    return Object.entries(data.sector_contributions)
      .map(([sector, c]) => ({
        name: sector.replace(/_/g, ' ').substring(0, 14),
        value: c.contribution * 100,
        impact: c.sector_impact * 100,
        fill: c.contribution > 0 ? '#10B981' : '#EF4444',
      }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
  }, [data])

  if (!data) {
    return (
      <div className="text-gray-500 text-sm p-4 text-center">
        No portfolio impact data available.
      </div>
    )
  }

  const impacts = data.impacts || []

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Portfolio Impact</h3>

      {data.summary && (
        <p className="text-sm text-gray-400">{data.summary}</p>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-900 rounded-lg p-3">
          <span className="text-xs text-gray-500">Total Impact</span>
          <p className={`text-xl font-bold ${data.total_portfolio_impact >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {(data.total_portfolio_impact * 100).toFixed(2)}%
          </p>
        </div>
        <div className="bg-gray-900 rounded-lg p-3">
          <span className="text-xs text-gray-500">Est. Volatility</span>
          <p className="text-xl font-bold text-blue-400">{data.estimated_volatility.toFixed(1)}</p>
        </div>
        <div className="bg-gray-900 rounded-lg p-3">
          <span className="text-xs text-gray-500">Risk Score</span>
          <p className="text-xl font-bold text-yellow-400">{data.risk_score.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 rounded-lg p-4">
          <span className="text-xs text-gray-400">Allocation</span>
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
          <span className="text-xs text-gray-400">Sector Contribution</span>
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

      {impacts.length > 0 && (
        <div className="bg-gray-900 rounded-lg p-4">
          <span className="text-xs text-gray-400">Sector Impacts</span>
          <ul className="mt-2 space-y-1">
            {impacts.map((i, idx) => (
              <li key={idx} className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{i.name.replace('sector_', '').replace(/_/g, ' ')}</span>
                <span className={i.value >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {(i.value * 100).toFixed(2)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

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

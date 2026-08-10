import { useState, useMemo, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Cell,
} from 'recharts'
import type { Country } from '../data/countries'
import { ChartSkeleton } from './Skeleton'
import { EmptyState } from './EmptyState'
import { fetchMarketPrices } from '../api/geopoliticalApi'
import { getEntityIdsForTicker } from '../api/countryApi'
import type { MarketPrice } from '../api/geopoliticalApi'

function rand(min: number, max: number) { return min + Math.random() * (max - min) }

interface Props {
  country?: Country | null
}

const sectorData = [
  { sector: 'Technology', change: 3.2 },
  { sector: 'Energy', change: -1.8 },
  { sector: 'Finance', change: 1.5 },
  { sector: 'Healthcare', change: 0.8 },
  { sector: 'Consumer', change: -0.5 },
  { sector: 'Industrial', change: 2.1 },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-black/80 dark:bg-gray-900/90 border border-white/10 rounded-lg px-3 py-2 text-xs text-white">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: ${p.value.toFixed(2)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function MarketCharts({ country }: Props) {
  const [chartView, setChartView] = useState<'prices' | 'sectors'>('prices')
  const [transition, setTransition] = useState(false)
  const [loading, setLoading] = useState(true)
  const [realPrices, setRealPrices] = useState<MarketPrice[] | null>(null)

  useEffect(() => {
    setLoading(true)
    setTransition(true)
    setRealPrices(null)

    const ticker = country?.tickers?.[0]
    if (ticker) {
      getEntityIdsForTicker(ticker).then((ids) => {
        const entityId = ids[0] ?? country?.entityIds?.[0]
        if (entityId) {
          fetchMarketPrices(entityId, 30).then((prices) => {
            if (prices.length > 0) setRealPrices(prices)
          }).catch(() => {})
        }
      }).catch(() => {})
    }

    const t = setTimeout(() => {
      setLoading(false)
      setTransition(false)
    }, 300)
    return () => clearTimeout(t)
  }, [country])

  const priceData = useMemo(() => {
    if (realPrices && realPrices.length > 0) {
      return realPrices.map((p, i) => ({
        day: `D${i + 1}`,
        [country?.tickers?.[0] || 'SPY']: p.close,
        [country?.tickers?.[1] || 'QQQ']: p.open,
        VIX: 18 + Math.sin(i * 0.4) * 5 + rand(-3, 3),
      }))
    }
    const base = country?.tickers?.[0] ? 100 + (country.tickers[0].charCodeAt(0) % 50) : 450
    return Array.from({ length: 30 }, (_, i) => ({
      day: `D${i + 1}`,
      [country?.tickers?.[0] || 'SPY']: base + Math.sin(i * 0.3) * 15 + rand(-8, 8),
      [country?.tickers?.[1] || 'QQQ']: base * 0.85 + Math.cos(i * 0.25) * 12 + rand(-6, 6),
      VIX: 18 + Math.sin(i * 0.4) * 5 + rand(-3, 3),
    }))
  }, [country, realPrices])

  const line1 = country?.tickers?.[0] || 'SPY'
  const line2 = country?.tickers?.[1] || 'QQQ'

  if (loading) return <ChartSkeleton />

  if (!country) {
    return <EmptyState title="Select a country" description="Pick a country to view market analytics." />
  }

  return (
    <div className={`transition-opacity duration-300 ${transition ? 'opacity-50' : 'opacity-100'}`}>
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setChartView('prices')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            chartView === 'prices'
              ? 'dark:bg-white/10 bg-gray-200 dark:text-white text-gray-900'
              : 'dark:text-gray-400 text-gray-600 hover:dark:bg-white/5 hover:bg-gray-100'
          }`}
        >
          Price Trends
        </button>
        <button
          onClick={() => setChartView('sectors')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            chartView === 'sectors'
              ? 'dark:bg-white/10 bg-gray-200 dark:text-white text-gray-900'
              : 'dark:text-gray-400 text-gray-600 hover:dark:bg-white/5 hover:bg-gray-100'
          }`}
        >
          Sector Performance
        </button>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        {chartView === 'prices' ? (
          <AreaChart data={priceData}>
            <defs>
              <linearGradient id="spyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="qqqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7b2ff7" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7b2ff7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey={line1} stroke="#00d4ff" fill="url(#spyGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey={line2} stroke="#7b2ff7" fill="url(#qqqGrad)" strokeWidth={2} />
          </AreaChart>
        ) : (
          <BarChart data={sectorData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis dataKey="sector" type="category" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="change" radius={[0, 4, 4, 0]}>
              {sectorData.map((entry, i) => (
                <Cell key={i} fill={entry.change >= 0 ? '#00ff88' : '#ff4444'} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

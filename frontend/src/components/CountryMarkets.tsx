import { useState, useEffect, useMemo } from 'react'
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip,
} from 'recharts'
import { TrendingUp, TrendingDown, BarChart3, DollarSign, Clock, Building2 } from 'lucide-react'
import { flagFromCode, type Country } from '../data/countries'
import { Skeleton } from './Skeleton'
import { fetchLatestPrice, fetchMarketPrices } from '../api/geopoliticalApi'
import { getEntityIdsForTicker } from '../api/countryApi'
import type { MarketPrice } from '../api/geopoliticalApi'

interface Props {
  country: Country
}

function rand(min: number, max: number) { return +(min + Math.random() * (max - min)).toFixed(2) }

const mockIndices: Record<string, { name: string; value: number; change: number }[]> = {
  US: [
    { name: 'S&P 500', value: 5842, change: 0.82 },
    { name: 'Dow Jones', value: 42156, change: 0.54 },
    { name: 'NASDAQ', value: 18943, change: 1.21 },
  ],
  JP: [
    { name: 'Nikkei 225', value: 38765, change: -0.31 },
    { name: 'TOPIX', value: 2734, change: -0.18 },
  ],
  GB: [
    { name: 'FTSE 100', value: 8234, change: 0.45 },
    { name: 'FTSE 250', value: 20123, change: 0.67 },
  ],
  DE: [
    { name: 'DAX', value: 18765, change: 0.93 },
    { name: 'MDAX', value: 26453, change: -0.22 },
  ],
  FR: [
    { name: 'CAC 40', value: 8123, change: 0.71 },
  ],
  CN: [
    { name: 'Shanghai Composite', value: 3156, change: -0.45 },
    { name: 'CSI 300', value: 3789, change: -0.28 },
    { name: 'Hang Seng', value: 18234, change: 1.05 },
  ],
  HK: [
    { name: 'Hang Seng', value: 18234, change: 1.05 },
  ],
  IN: [
    { name: 'BSE Sensex', value: 74356, change: 0.63 },
    { name: 'Nifty 50', value: 22567, change: 0.71 },
  ],
  KR: [
    { name: 'KOSPI', value: 2765, change: -0.12 },
    { name: 'KOSDAQ', value: 876, change: 0.34 },
  ],
  AU: [
    { name: 'ASX 200', value: 7834, change: 0.28 },
  ],
  BR: [
    { name: 'IBOVESPA', value: 129876, change: -0.54 },
  ],
  SA: [
    { name: 'Tadawul All Share', value: 12345, change: 0.38 },
  ],
  SG: [
    { name: 'STI', value: 3234, change: 0.15 },
  ],
  CH: [
    { name: 'SMI', value: 12156, change: 0.42 },
  ],
  NL: [
    { name: 'AEX', value: 912, change: 0.56 },
  ],
}

function getIndices(countryCode: string) {
  return mockIndices[countryCode] || [
    { name: `${countryCode} Composite`, value: rand(500, 5000), change: rand(-2, 2) },
  ]
}

export default function CountryMarkets({ country }: Props) {
  const [loading, setLoading] = useState(true)
  const [realPrices, setRealPrices] = useState<MarketPrice[] | null>(null)
  const [realLatest, setRealLatest] = useState<MarketPrice | null>(null)

  useEffect(() => {
    setLoading(true)
    setRealPrices(null)
    setRealLatest(null)

    const ticker = country.tickers[0]
    if (ticker) {
      getEntityIdsForTicker(ticker).then((ids) => {
        const entityId = ids[0] ?? country.entityIds?.[0]
        if (entityId) {
          fetchLatestPrice(entityId).then((price) => {
            if (price) setRealLatest(price)
          }).catch(() => {})
          fetchMarketPrices(entityId, 30).then((prices) => {
            if (prices.length > 0) setRealPrices(prices)
          }).catch(() => {})
        }
      }).catch(() => {})
    }

    const t = setTimeout(() => setLoading(false), 300)
    return () => clearTimeout(t)
  }, [country.code])

  const indices = useMemo(() => {
    const base = getIndices(country.code).map(i => ({
      ...i,
      value: i.value + rand(-10, 10),
      change: i.change + rand(-0.3, 0.3),
    }))
    if (realLatest && base.length > 0) {
      base[0] = { ...base[0], value: realLatest.close, change: ((realLatest.close - realLatest.open) / realLatest.open) * 100 }
    }
    return base
  }, [country.code, realLatest])

  const chartData = useMemo(() => {
    if (realPrices && realPrices.length > 0) {
      return realPrices.map((p, i) => ({
        day: `D${i + 1}`,
        value: p.close,
      }))
    }
    return Array.from({ length: 30 }, (_, i) => ({
      day: `D${i + 1}`,
      value: indices[0].value * (1 + Math.sin(i * 0.2) * 0.02 + (Math.random() - 0.5) * 0.01),
    }))
  }, [country.code, realPrices, indices])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b dark:border-white/10 border-gray-200">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="dark:bg-white/5 bg-gray-100 rounded-xl p-2.5 border dark:border-white/10 border-gray-200">
              <Skeleton className="h-3 w-12 mb-2" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="h-3 w-24 mb-2" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Country Header */}
      <div className="flex items-center gap-3 pb-3 border-b dark:border-white/10 border-gray-200">
        <span className="text-3xl">{flagFromCode(country.code)}</span>
        <div>
          <h3 className="text-lg font-bold dark:text-white text-gray-900">{country.name}</h3>
          {country.stockExchange && (
            <div className="flex items-center gap-1.5 text-xs dark:text-gray-400 text-gray-600">
              <Building2 className="w-3 h-3" />
              {country.stockExchange}
            </div>
          )}
        </div>
      </div>

      {/* Info badges */}
      <div className="grid grid-cols-3 gap-2">
        <div className="dark:bg-white/5 bg-gray-100 rounded-xl p-2.5 border dark:border-white/10 border-gray-200">
          <div className="flex items-center gap-1.5 text-[10px] dark:text-gray-400 text-gray-600 mb-0.5">
            <DollarSign className="w-3 h-3" />
            Currency
          </div>
          <div className="text-sm font-semibold dark:text-white text-gray-900">
            {country.currency} ({country.currencySymbol})
          </div>
        </div>
        <div className="dark:bg-white/5 bg-gray-100 rounded-xl p-2.5 border dark:border-white/10 border-gray-200">
          <div className="flex items-center gap-1.5 text-[10px] dark:text-gray-400 text-gray-600 mb-0.5">
            <BarChart3 className="w-3 h-3" />
            Market Cap
          </div>
          <div className="text-sm font-semibold dark:text-white text-gray-900">
            {country.marketCap || 'N/A'}
          </div>
        </div>
        <div className="dark:bg-white/5 bg-gray-100 rounded-xl p-2.5 border dark:border-white/10 border-gray-200">
          <div className="flex items-center gap-1.5 text-[10px] dark:text-gray-400 text-gray-600 mb-0.5">
            <Clock className="w-3 h-3" />
            Hours
          </div>
          <div className="text-sm font-semibold dark:text-white text-gray-900 truncate" title={country.tradingHours || 'N/A'}>
            {country.tradingHours || 'N/A'}
          </div>
        </div>
      </div>

      {/* Indices */}
      <div>
        <h4 className="text-xs font-semibold dark:text-gray-300 text-gray-700 uppercase tracking-wider mb-2">
          Major Indices
        </h4>
        <div className="space-y-1.5">
          {indices.map((idx, i) => (
            <div key={i} className="flex items-center justify-between dark:bg-white/5 bg-gray-100 rounded-lg px-3 py-2 border dark:border-white/10 border-gray-200">
              <span className="text-xs dark:text-gray-300 text-gray-700 font-medium">{idx.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold dark:text-white text-gray-900">
                  {idx.value.toLocaleString()}
                </span>
                <span className={`flex items-center gap-0.5 text-xs font-medium ${idx.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {idx.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {idx.change >= 0 ? '+' : ''}{idx.change.toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mini chart */}
      <div>
        <h4 className="text-xs font-semibold dark:text-gray-300 text-gray-700 uppercase tracking-wider mb-2">
          {indices[0].name} (30d)
        </h4>
        <div className="dark:bg-white/5 bg-gray-100 rounded-xl p-2 border dark:border-white/10 border-gray-200">
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData}>
              <XAxis dataKey="day" hide />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(0,0,0,0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#fff',
                }}
                labelStyle={{ display: 'none' }}
                formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Price']}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#00d4ff"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tickers */}
      <div>
        <h4 className="text-xs font-semibold dark:text-gray-300 text-gray-700 uppercase tracking-wider mb-2">
          Notable Tickers
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {country.tickers.map(t => (
            <span
              key={t}
              className="text-[11px] px-2 py-1 rounded-md dark:bg-white/5 bg-gray-100 dark:text-gray-300 text-gray-700 font-mono border dark:border-white/10 border-gray-200"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

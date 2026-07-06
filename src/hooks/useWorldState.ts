import { useState, useEffect, useCallback } from 'react'

export interface LiveCountryState {
  id: string
  name: string
  risk_score: number
  risk_level: string
  military_activity: number
  geopolitical_risk: number
  economic_risk: number
  confidence: number
}

export interface DashboardData {
  global_risk: {
    composite: number
    geopolitical: number
    economic: number
    market: number
    infrastructure: number
    level: string
  }
  countries: LiveCountryState[]
  version: number
  prediction?: Record<string, number> | null
}

export function useWorldState() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, countriesRes] = await Promise.all([
        fetch('/api/world-state/dashboard').then(r => r.ok ? r.json() : Promise.reject('dashboard failed')),
        fetch('/api/world-state/countries').then(r => r.ok ? r.json() : Promise.reject('countries failed')),
      ])
      setDashboard({ ...dashRes, countries: countriesRes.countries || [] })
      setError(null)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  return { dashboard, loading, error, refetch: fetchData }
}

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  'united states': 'US', 'usa': 'US', 'china': 'CN', 'russia': 'RU',
  'iran': 'IR', 'ukraine': 'UA', 'germany': 'DE', 'france': 'FR',
  'united kingdom': 'GB', 'uk': 'GB', 'india': 'IN', 'japan': 'JP',
  'south korea': 'KR', 'brazil': 'BR', 'canada': 'CA', 'australia': 'AU',
  'saudi arabia': 'SA', 'turkey': 'TR', 'israel': 'IL', 'taiwan': 'TW',
  'mexico': 'MX', 'indonesia': 'ID', 'netherlands': 'NL', 'switzerland': 'CH',
  'singapore': 'SG', 'sweden': 'SE', 'norway': 'NO', 'poland': 'PL',
  'argentina': 'AR', 'nigeria': 'NG', 'south africa': 'ZA', 'egypt': 'EG',
}

export function riskScoreToColor(score: number): string {
  if (score < 0.2) return '#22c55e'
  if (score < 0.35) return '#84cc16'
  if (score < 0.5) return '#eab308'
  if (score < 0.65) return '#f97316'
  if (score < 0.8) return '#ef4444'
  return '#dc2626'
}

export function countryNameToCode(name: string): string {
  return COUNTRY_NAME_TO_CODE[name.toLowerCase()] || ''
}


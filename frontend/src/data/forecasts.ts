export interface ForecastScenario {
  day: number
  riskScore: number
  gdpImpact: number
  conflictProbability: number
  marketImpact: number
  affectedSectors: string[]
  events: string[]
}

export interface Forecast {
  code: string
  name: string
  scenarios: ForecastScenario[]
}

interface WorldStateForForecast {
  code: string
  name: string
  riskScore: number
}

const worldStateForecastData: WorldStateForForecast[] = [
  { code: 'US', name: 'United States', riskScore: 35 },
  { code: 'CN', name: 'China', riskScore: 55 },
  { code: 'JP', name: 'Japan', riskScore: 30 },
  { code: 'DE', name: 'Germany', riskScore: 32 },
  { code: 'GB', name: 'United Kingdom', riskScore: 34 },
  { code: 'IN', name: 'India', riskScore: 45 },
  { code: 'FR', name: 'France', riskScore: 30 },
  { code: 'RU', name: 'Russia', riskScore: 78 },
  { code: 'BR', name: 'Brazil', riskScore: 48 },
  { code: 'KR', name: 'South Korea', riskScore: 38 },
  { code: 'SA', name: 'Saudi Arabia', riskScore: 55 },
  { code: 'IR', name: 'Iran', riskScore: 88 },
  { code: 'IL', name: 'Israel', riskScore: 65 },
  { code: 'TW', name: 'Taiwan', riskScore: 60 },
  { code: 'NG', name: 'Nigeria', riskScore: 70 },
  { code: 'AR', name: 'Argentina', riskScore: 82 },
  { code: 'TR', name: 'Turkey', riskScore: 65 },
  { code: 'PK', name: 'Pakistan', riskScore: 72 },
]

export const forecasts: Forecast[] = worldStateForecastData.map(w => ({
  code: w.code,
  name: w.name,
  scenarios: [
    {
      day: 0,
      riskScore: w.riskScore,
      gdpImpact: 0,
      conflictProbability: w.riskScore > 60 ? 0.4 : w.riskScore > 40 ? 0.2 : 0.05,
      marketImpact: 0,
      affectedSectors: [],
      events: [],
    },
    {
      day: 7,
      riskScore: Math.min(100, w.riskScore + (Math.random() - 0.4) * 8),
      gdpImpact: (Math.random() - 0.3) * 0.5,
      conflictProbability: Math.min(1, (w.riskScore > 60 ? 0.4 : w.riskScore > 40 ? 0.2 : 0.05) + (Math.random() - 0.4) * 0.1),
      marketImpact: (Math.random() - 0.3) * 2,
      affectedSectors: w.riskScore > 50 ? ['Energy', 'Defense'] : ['Technology', 'Financial'],
      events: [],
    },
    {
      day: 30,
      riskScore: Math.min(100, w.riskScore + (Math.random() - 0.3) * 15),
      gdpImpact: (Math.random() - 0.2) * 1.5,
      conflictProbability: Math.min(1, (w.riskScore > 60 ? 0.5 : 0.15) + (Math.random() - 0.3) * 0.2),
      marketImpact: (Math.random() - 0.2) * 5,
      affectedSectors: w.riskScore > 50
        ? ['Energy', 'Defense', 'Shipping', 'Financial']
        : ['Technology', 'Financial', 'Consumer', 'Healthcare'],
      events: [],
    },
    {
      day: 90,
      riskScore: Math.min(100, w.riskScore + (Math.random() - 0.2) * 25),
      gdpImpact: (Math.random() - 0.1) * 3,
      conflictProbability: Math.min(1, (w.riskScore > 60 ? 0.6 : 0.2) + (Math.random() - 0.2) * 0.3),
      marketImpact: (Math.random() - 0.1) * 10,
      affectedSectors: w.riskScore > 50
        ? ['Energy', 'Defense', 'Shipping', 'Financial', 'Agriculture']
        : ['Technology', 'Financial', 'Consumer', 'Healthcare', 'Industrial'],
      events: [],
    },
  ],
}))

export function getForecast(code: string): Forecast | undefined {
  return forecasts.find(f => f.code === code)
}

export function getForecastAtDay(code: string, day: number): ForecastScenario | undefined {
  const forecast = forecasts.find(f => f.code === code)
  if (!forecast) return undefined
  let best = forecast.scenarios[0]
  for (const s of forecast.scenarios) {
    if (Math.abs(s.day - day) < Math.abs(best.day - day)) {
      best = s
    }
  }
  return best
}

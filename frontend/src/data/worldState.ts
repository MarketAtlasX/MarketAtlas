export interface WorldState {
  code: string
  name: string
  gdp: number
  gdpGrowth: number
  inflation: number
  riskScore: number
  militarySpending: number
  tradeVolume: number
  stabilityIndex: number
  population: number
}

export const worldStates: WorldState[] = [
  { code: 'US', name: 'United States', gdp: 27360, gdpGrowth: 2.1, inflation: 3.2, riskScore: 35, militarySpending: 916, tradeVolume: 5230, stabilityIndex: 78, population: 335 },
  { code: 'CN', name: 'China', gdp: 17700, gdpGrowth: 4.6, inflation: 1.8, riskScore: 55, militarySpending: 296, tradeVolume: 6650, stabilityIndex: 65, population: 1412 },
  { code: 'JP', name: 'Japan', gdp: 4230, gdpGrowth: 1.0, inflation: 2.5, riskScore: 30, militarySpending: 50, tradeVolume: 1680, stabilityIndex: 82, population: 125 },
  { code: 'DE', name: 'Germany', gdp: 4450, gdpGrowth: 0.3, inflation: 3.0, riskScore: 32, militarySpending: 56, tradeVolume: 3200, stabilityIndex: 80, population: 84 },
  { code: 'GB', name: 'United Kingdom', gdp: 3340, gdpGrowth: 0.8, inflation: 3.5, riskScore: 34, militarySpending: 68, tradeVolume: 1850, stabilityIndex: 76, population: 68 },
  { code: 'IN', name: 'India', gdp: 3550, gdpGrowth: 6.5, inflation: 4.2, riskScore: 45, militarySpending: 74, tradeVolume: 1150, stabilityIndex: 60, population: 1428 },
  { code: 'FR', name: 'France', gdp: 3030, gdpGrowth: 0.9, inflation: 2.8, riskScore: 30, militarySpending: 54, tradeVolume: 1420, stabilityIndex: 77, population: 68 },
  { code: 'IT', name: 'Italy', gdp: 2250, gdpGrowth: 0.7, inflation: 3.1, riskScore: 35, militarySpending: 29, tradeVolume: 1120, stabilityIndex: 72, population: 59 },
  { code: 'BR', name: 'Brazil', gdp: 2170, gdpGrowth: 2.2, inflation: 4.5, riskScore: 48, militarySpending: 20, tradeVolume: 680, stabilityIndex: 55, population: 216 },
  { code: 'CA', name: 'Canada', gdp: 2140, gdpGrowth: 1.5, inflation: 2.9, riskScore: 22, militarySpending: 27, tradeVolume: 1150, stabilityIndex: 85, population: 40 },
  { code: 'RU', name: 'Russia', gdp: 2020, gdpGrowth: 2.8, inflation: 6.5, riskScore: 78, militarySpending: 109, tradeVolume: 890, stabilityIndex: 35, population: 144 },
  { code: 'KR', name: 'South Korea', gdp: 1710, gdpGrowth: 2.0, inflation: 2.6, riskScore: 38, militarySpending: 44, tradeVolume: 1410, stabilityIndex: 75, population: 52 },
  { code: 'AU', name: 'Australia', gdp: 1720, gdpGrowth: 2.3, inflation: 3.0, riskScore: 20, militarySpending: 32, tradeVolume: 660, stabilityIndex: 87, population: 26 },
  { code: 'MX', name: 'Mexico', gdp: 1470, gdpGrowth: 2.5, inflation: 4.8, riskScore: 50, militarySpending: 8, tradeVolume: 1150, stabilityIndex: 52, population: 129 },
  { code: 'ID', name: 'Indonesia', gdp: 1370, gdpGrowth: 5.0, inflation: 3.5, riskScore: 42, militarySpending: 9, tradeVolume: 410, stabilityIndex: 58, population: 277 },
  { code: 'NL', name: 'Netherlands', gdp: 1110, gdpGrowth: 1.2, inflation: 2.7, riskScore: 18, militarySpending: 15, tradeVolume: 1190, stabilityIndex: 88, population: 18 },
  { code: 'SA', name: 'Saudi Arabia', gdp: 1070, gdpGrowth: 3.8, inflation: 2.2, riskScore: 55, militarySpending: 78, tradeVolume: 620, stabilityIndex: 50, population: 36 },
  { code: 'TR', name: 'Turkey', gdp: 1100, gdpGrowth: 3.5, inflation: 38.0, riskScore: 65, militarySpending: 16, tradeVolume: 510, stabilityIndex: 38, population: 85 },
  { code: 'CH', name: 'Switzerland', gdp: 885, gdpGrowth: 1.0, inflation: 2.0, riskScore: 12, militarySpending: 6, tradeVolume: 690, stabilityIndex: 92, population: 9 },
  { code: 'TW', name: 'Taiwan', gdp: 755, gdpGrowth: 2.5, inflation: 2.1, riskScore: 60, militarySpending: 18, tradeVolume: 790, stabilityIndex: 55, population: 24 },
  { code: 'AE', name: 'UAE', gdp: 504, gdpGrowth: 4.0, inflation: 2.5, riskScore: 28, militarySpending: 22, tradeVolume: 520, stabilityIndex: 72, population: 10 },
  { code: 'SG', name: 'Singapore', gdp: 501, gdpGrowth: 2.8, inflation: 3.0, riskScore: 15, militarySpending: 12, tradeVolume: 920, stabilityIndex: 90, population: 6 },
  { code: 'IL', name: 'Israel', gdp: 510, gdpGrowth: 3.2, inflation: 2.8, riskScore: 65, militarySpending: 24, tradeVolume: 210, stabilityIndex: 45, population: 10 },
  { code: 'IR', name: 'Iran', gdp: 366, gdpGrowth: 1.5, inflation: 42.0, riskScore: 88, militarySpending: 25, tradeVolume: 180, stabilityIndex: 22, population: 88 },
  { code: 'AR', name: 'Argentina', gdp: 640, gdpGrowth: -2.5, inflation: 120.0, riskScore: 82, militarySpending: 3, tradeVolume: 160, stabilityIndex: 25, population: 46 },
  { code: 'NG', name: 'Nigeria', gdp: 363, gdpGrowth: 3.0, inflation: 18.5, riskScore: 70, militarySpending: 2, tradeVolume: 110, stabilityIndex: 30, population: 223 },
  { code: 'ZA', name: 'South Africa', gdp: 399, gdpGrowth: 1.2, inflation: 5.5, riskScore: 55, militarySpending: 3, tradeVolume: 210, stabilityIndex: 48, population: 60 },
  { code: 'EG', name: 'Egypt', gdp: 398, gdpGrowth: 4.0, inflation: 14.0, riskScore: 60, militarySpending: 5, tradeVolume: 130, stabilityIndex: 40, population: 110 },
  { code: 'TH', name: 'Thailand', gdp: 514, gdpGrowth: 3.5, inflation: 2.0, riskScore: 35, militarySpending: 7, tradeVolume: 480, stabilityIndex: 62, population: 72 },
  { code: 'VN', name: 'Vietnam', gdp: 433, gdpGrowth: 6.0, inflation: 3.2, riskScore: 38, militarySpending: 6, tradeVolume: 650, stabilityIndex: 58, population: 99 },
  { code: 'MY', name: 'Malaysia', gdp: 430, gdpGrowth: 4.5, inflation: 2.5, riskScore: 30, militarySpending: 4, tradeVolume: 470, stabilityIndex: 65, population: 34 },
  { code: 'PH', name: 'Philippines', gdp: 435, gdpGrowth: 5.5, inflation: 3.8, riskScore: 40, militarySpending: 4, tradeVolume: 230, stabilityIndex: 52, population: 117 },
  { code: 'PK', name: 'Pakistan', gdp: 338, gdpGrowth: 2.5, inflation: 12.0, riskScore: 72, militarySpending: 10, tradeVolume: 110, stabilityIndex: 32, population: 240 },
  { code: 'CL', name: 'Chile', gdp: 335, gdpGrowth: 2.0, inflation: 3.8, riskScore: 28, militarySpending: 5, tradeVolume: 190, stabilityIndex: 68, population: 20 },
  { code: 'CO', name: 'Colombia', gdp: 363, gdpGrowth: 2.8, inflation: 6.5, riskScore: 48, militarySpending: 10, tradeVolume: 140, stabilityIndex: 45, population: 52 },
  { code: 'QA', name: 'Qatar', gdp: 235, gdpGrowth: 3.2, inflation: 2.8, riskScore: 25, militarySpending: 6, tradeVolume: 180, stabilityIndex: 75, population: 3 },
  { code: 'KW', name: 'Kuwait', gdp: 160, gdpGrowth: 2.5, inflation: 3.0, riskScore: 32, militarySpending: 8, tradeVolume: 110, stabilityIndex: 68, population: 4 },
  { code: 'NZ', name: 'New Zealand', gdp: 249, gdpGrowth: 1.8, inflation: 2.5, riskScore: 15, militarySpending: 3, tradeVolume: 110, stabilityIndex: 90, population: 5 },
  { code: 'HK', name: 'Hong Kong', gdp: 382, gdpGrowth: 2.0, inflation: 2.2, riskScore: 40, militarySpending: 0, tradeVolume: 1280, stabilityIndex: 60, population: 7 },
  { code: 'SE', name: 'Sweden', gdp: 593, gdpGrowth: 1.5, inflation: 2.5, riskScore: 18, militarySpending: 8, tradeVolume: 380, stabilityIndex: 88, population: 11 },
  { code: 'NO', name: 'Norway', gdp: 485, gdpGrowth: 1.8, inflation: 2.8, riskScore: 15, militarySpending: 8, tradeVolume: 280, stabilityIndex: 90, population: 5 },
  { code: 'PL', name: 'Poland', gdp: 808, gdpGrowth: 3.2, inflation: 4.0, riskScore: 30, militarySpending: 16, tradeVolume: 610, stabilityIndex: 68, population: 37 },
  { code: 'BE', name: 'Belgium', gdp: 632, gdpGrowth: 1.2, inflation: 2.8, riskScore: 20, militarySpending: 5, tradeVolume: 840, stabilityIndex: 82, population: 12 },
  { code: 'IE', name: 'Ireland', gdp: 545, gdpGrowth: 4.5, inflation: 2.5, riskScore: 14, militarySpending: 1, tradeVolume: 480, stabilityIndex: 85, population: 5 },
  { code: 'AT', name: 'Austria', gdp: 516, gdpGrowth: 1.0, inflation: 3.0, riskScore: 20, militarySpending: 4, tradeVolume: 330, stabilityIndex: 82, population: 9 },
  { code: 'DK', name: 'Denmark', gdp: 400, gdpGrowth: 1.8, inflation: 2.5, riskScore: 14, militarySpending: 5, tradeVolume: 260, stabilityIndex: 90, population: 6 },
  { code: 'FI', name: 'Finland', gdp: 296, gdpGrowth: 1.2, inflation: 2.8, riskScore: 16, militarySpending: 5, tradeVolume: 180, stabilityIndex: 88, population: 6 },
  { code: 'GR', name: 'Greece', gdp: 242, gdpGrowth: 2.0, inflation: 3.5, riskScore: 35, militarySpending: 8, tradeVolume: 140, stabilityIndex: 58, population: 10 },
  { code: 'PT', name: 'Portugal', gdp: 276, gdpGrowth: 1.8, inflation: 2.5, riskScore: 22, militarySpending: 4, tradeVolume: 180, stabilityIndex: 72, population: 10 },
  { code: 'ES', name: 'Spain', gdp: 1581, gdpGrowth: 2.2, inflation: 3.0, riskScore: 25, militarySpending: 13, tradeVolume: 820, stabilityIndex: 72, population: 48 },
  { code: 'MA', name: 'Morocco', gdp: 152, gdpGrowth: 3.0, inflation: 3.5, riskScore: 35, militarySpending: 5, tradeVolume: 90, stabilityIndex: 55, population: 38 },
  { code: 'KE', name: 'Kenya', gdp: 113, gdpGrowth: 5.0, inflation: 6.5, riskScore: 45, militarySpending: 1, tradeVolume: 40, stabilityIndex: 48, population: 55 },
  { code: 'MU', name: 'Mauritius', gdp: 14, gdpGrowth: 4.0, inflation: 3.0, riskScore: 18, militarySpending: 0.2, tradeVolume: 12, stabilityIndex: 82, population: 1 },
]

export function getWorldState(code: string): WorldState | undefined {
  return worldStates.find(s => s.code === code)
}

export function getRiskColor(score: number): string {
  if (score < 20) return '#22c55e'
  if (score < 35) return '#84cc16'
  if (score < 50) return '#eab308'
  if (score < 65) return '#f97316'
  if (score < 80) return '#ef4444'
  return '#dc2626'
}

export function getRiskTextColor(score: number): string {
  if (score < 20) return '#166534'
  if (score < 35) return '#4d7c0f'
  if (score < 50) return '#a16207'
  if (score < 65) return '#c2410c'
  if (score < 80) return '#991b1b'
  return '#7f1d1d'
}



export interface TradeRoute {
  from: string
  to: string
  value: string
  fromLat: number
  fromLng: number
  toLat: number
  toLng: number
  color: string
}

export interface MilitaryRelation {
  countryA: string
  countryB: string
  type: 'alliance' | 'rivalry' | 'conflict' | 'neutral'
  label: string
  fromLat: number
  fromLng: number
  toLat: number
  toLng: number
}

export interface PortData {
  countryCode: string
  name: string
  lat: number
  lng: number
  volume: 'major' | 'medium' | 'minor'
}

const countryCoords: Record<string, { lat: number; lng: number }> = {
  US: { lat: 37.09, lng: -95.71 }, CA: { lat: 56.13, lng: -106.35 }, BR: { lat: -14.24, lng: -51.93 },
  MX: { lat: 23.63, lng: -102.55 }, AR: { lat: -38.42, lng: -63.62 }, CL: { lat: -35.68, lng: -71.54 },
  CO: { lat: 4.57, lng: -74.30 }, GB: { lat: 55.38, lng: -3.44 }, DE: { lat: 51.17, lng: 10.45 },
  FR: { lat: 46.60, lng: 1.89 }, CH: { lat: 46.82, lng: 8.23 }, NL: { lat: 52.13, lng: 5.29 },
  SE: { lat: 60.13, lng: 18.64 }, DK: { lat: 56.26, lng: 9.50 }, NO: { lat: 60.47, lng: 8.47 },
  IT: { lat: 41.87, lng: 12.57 }, ES: { lat: 40.46, lng: -3.75 }, IE: { lat: 53.41, lng: -8.24 },
  BE: { lat: 50.85, lng: 4.35 }, PT: { lat: 39.40, lng: -8.22 }, AT: { lat: 47.52, lng: 14.55 },
  FI: { lat: 61.92, lng: 25.75 }, GR: { lat: 39.07, lng: 21.82 }, PL: { lat: 51.92, lng: 19.15 },
  RU: { lat: 61.52, lng: 105.32 }, TR: { lat: 38.96, lng: 35.24 }, JP: { lat: 36.20, lng: 138.25 },
  CN: { lat: 35.86, lng: 104.19 }, HK: { lat: 22.32, lng: 114.17 }, KR: { lat: 35.91, lng: 127.77 },
  IN: { lat: 20.59, lng: 78.96 }, AU: { lat: -25.27, lng: 133.77 }, SG: { lat: 1.35, lng: 103.82 },
  TW: { lat: 23.70, lng: 120.96 }, MY: { lat: 4.21, lng: 101.98 }, ID: { lat: -0.79, lng: 113.92 },
  TH: { lat: 15.87, lng: 100.99 }, PH: { lat: 12.88, lng: 121.77 }, VN: { lat: 14.06, lng: 108.28 },
  NZ: { lat: -40.90, lng: 174.89 }, AE: { lat: 23.42, lng: 53.85 }, SA: { lat: 23.89, lng: 45.08 },
  QA: { lat: 25.35, lng: 51.18 }, KW: { lat: 29.31, lng: 47.48 }, IL: { lat: 31.05, lng: 34.85 },
  ZA: { lat: -30.56, lng: 22.94 }, NG: { lat: 9.08, lng: 8.68 }, KE: { lat: -0.02, lng: 37.91 },
  EG: { lat: 26.82, lng: 30.80 }, MA: { lat: 31.79, lng: -7.09 }, MU: { lat: -20.35, lng: 57.55 },
  PK: { lat: 30.38, lng: 69.35 }, IR: { lat: 32.43, lng: 53.69 },
}

const tc = (a: string, b: string): { fromLat: number; fromLng: number; toLat: number; toLng: number } => ({
  fromLat: countryCoords[a].lat, fromLng: countryCoords[a].lng,
  toLat: countryCoords[b].lat, toLng: countryCoords[b].lng,
})

export const tradeRoutes: TradeRoute[] = [
  { ...tc('US', 'CN'), from: 'US', to: 'CN', value: '$558B', color: '#00d4ff' },
  { ...tc('US', 'MX'), from: 'US', to: 'MX', value: '$415B', color: '#00ff88' },
  { ...tc('US', 'CA'), from: 'US', to: 'CA', value: '$382B', color: '#00d4ff' },
  { ...tc('US', 'JP'), from: 'US', to: 'JP', value: '$208B', color: '#00d4ff' },
  { ...tc('US', 'DE'), from: 'US', to: 'DE', value: '$190B', color: '#00d4ff' },
  { ...tc('US', 'GB'), from: 'US', to: 'GB', value: '$260B', color: '#00ff88' },
  { ...tc('US', 'KR'), from: 'US', to: 'KR', value: '$165B', color: '#00d4ff' },
  { ...tc('US', 'IN'), from: 'US', to: 'IN', value: '$146B', color: '#00d4ff' },
  { ...tc('CN', 'JP'), from: 'CN', to: 'JP', value: '$348B', color: '#00ff88' },
  { ...tc('CN', 'KR'), from: 'CN', to: 'KR', value: '$312B', color: '#00ff88' },
  { ...tc('CN', 'DE'), from: 'CN', to: 'DE', value: '$245B', color: '#ffaa00' },
  { ...tc('CN', 'AU'), from: 'CN', to: 'AU', value: '$207B', color: '#ffaa00' },
  { ...tc('CN', 'RU'), from: 'CN', to: 'RU', value: '$190B', color: '#ffaa00' },
  { ...tc('CN', 'BR'), from: 'CN', to: 'BR', value: '$152B', color: '#ffaa00' },
  { ...tc('DE', 'NL'), from: 'DE', to: 'NL', value: '$195B', color: '#00d4ff' },
  { ...tc('DE', 'FR'), from: 'DE', to: 'FR', value: '$182B', color: '#00d4ff' },
  { ...tc('DE', 'CN'), from: 'DE', to: 'CN', value: '$245B', color: '#ffaa00' },
  { ...tc('JP', 'KR'), from: 'JP', to: 'KR', value: '$142B', color: '#00ff88' },
  { ...tc('JP', 'AU'), from: 'JP', to: 'AU', value: '$125B', color: '#00ff88' },
  { ...tc('GB', 'US'), from: 'GB', to: 'US', value: '$260B', color: '#00ff88' },
  { ...tc('GB', 'DE'), from: 'GB', to: 'DE', value: '$155B', color: '#00d4ff' },
  { ...tc('GB', 'NL'), from: 'GB', to: 'NL', value: '$130B', color: '#00d4ff' },
  { ...tc('IN', 'AE'), from: 'IN', to: 'AE', value: '$105B', color: '#ffaa00' },
  { ...tc('IN', 'US'), from: 'IN', to: 'US', value: '$146B', color: '#00d4ff' },
  { ...tc('RU', 'DE'), from: 'RU', to: 'DE', value: '$135B', color: '#ff4444' },
  { ...tc('RU', 'CN'), from: 'RU', to: 'CN', value: '$190B', color: '#ffaa00' },
  { ...tc('SA', 'CN'), from: 'SA', to: 'CN', value: '$120B', color: '#ffaa00' },
  { ...tc('SA', 'US'), from: 'SA', to: 'US', value: '$85B', color: '#ffaa00' },
  { ...tc('BR', 'CN'), from: 'BR', to: 'CN', value: '$152B', color: '#ffaa00' },
  { ...tc('AU', 'CN'), from: 'AU', to: 'CN', value: '$207B', color: '#ffaa00' },
  { ...tc('AU', 'JP'), from: 'AU', to: 'JP', value: '$125B', color: '#00ff88' },
  { ...tc('KR', 'CN'), from: 'KR', to: 'CN', value: '$312B', color: '#00ff88' },
  { ...tc('KR', 'US'), from: 'KR', to: 'US', value: '$165B', color: '#00d4ff' },
  { ...tc('SG', 'CN'), from: 'SG', to: 'CN', value: '$140B', color: '#ffaa00' },
  { ...tc('MY', 'SG'), from: 'MY', to: 'SG', value: '$95B', color: '#00ff88' },
  { ...tc('ID', 'CN'), from: 'ID', to: 'CN', value: '$110B', color: '#ffaa00' },
  { ...tc('AE', 'IN'), from: 'AE', to: 'IN', value: '$105B', color: '#ffaa00' },
  { ...tc('NG', 'US'), from: 'NG', to: 'US', value: '$25B', color: '#ff4444' },
  { ...tc('ZA', 'CN'), from: 'ZA', to: 'CN', value: '$75B', color: '#ffaa00' },
  { ...tc('TR', 'DE'), from: 'TR', to: 'DE', value: '$68B', color: '#ffaa00' },
]

export const militaryRelations: MilitaryRelation[] = [
  { ...tc('US', 'GB'), countryA: 'US', countryB: 'GB', type: 'alliance', label: 'NATO - Five Eyes' },
  { ...tc('US', 'CA'), countryA: 'US', countryB: 'CA', type: 'alliance', label: 'NATO - NORAD' },
  { ...tc('US', 'DE'), countryA: 'US', countryB: 'DE', type: 'alliance', label: 'NATO Alliance' },
  { ...tc('US', 'FR'), countryA: 'US', countryB: 'FR', type: 'alliance', label: 'NATO Alliance' },
  { ...tc('US', 'JP'), countryA: 'US', countryB: 'JP', type: 'alliance', label: 'US-Japan Security Treaty' },
  { ...tc('US', 'KR'), countryA: 'US', countryB: 'KR', type: 'alliance', label: 'US-ROK Mutual Defense' },
  { ...tc('US', 'AU'), countryA: 'US', countryB: 'AU', type: 'alliance', label: 'ANZUS - AUKUS' },
  { ...tc('RU', 'CN'), countryA: 'RU', countryB: 'CN', type: 'alliance', label: 'Strategic Partnership' },
  { ...tc('RU', 'IN'), countryA: 'RU', countryB: 'IN', type: 'alliance', label: 'Defense Partnership' },
  { ...tc('CN', 'PK'), countryA: 'CN', countryB: 'PK', type: 'alliance', label: 'China-Pakistan Alliance' },
  { ...tc('US', 'RU'), countryA: 'US', countryB: 'RU', type: 'rivalry', label: 'Geopolitical Rivalry' },
  { ...tc('US', 'CN'), countryA: 'US', countryB: 'CN', type: 'rivalry', label: 'Strategic Competition' },
  { ...tc('IN', 'CN'), countryA: 'IN', countryB: 'CN', type: 'rivalry', label: 'Border Disputes' },
  { ...tc('IN', 'PK'), countryA: 'IN', countryB: 'PK', type: 'conflict', label: 'Kashmir Conflict' },
  { ...tc('IL', 'IR'), countryA: 'IL', countryB: 'IR', type: 'conflict', label: 'Regional Conflict' },
  { ...tc('RU', 'GB'), countryA: 'RU', countryB: 'GB', type: 'rivalry', label: 'Strategic Rivalry' },
  { ...tc('CN', 'TW'), countryA: 'CN', countryB: 'TW', type: 'conflict', label: 'Territorial Dispute' },
  { ...tc('KR', 'JP'), countryA: 'KR', countryB: 'JP', type: 'neutral', label: 'Historical Tensions' },
  { ...tc('SA', 'IR'), countryA: 'SA', countryB: 'IR', type: 'rivalry', label: 'Regional Proxy Conflict' },
  { ...tc('US', 'IL'), countryA: 'US', countryB: 'IL', type: 'alliance', label: 'Strategic Ally' },
  { ...tc('RU', 'TR'), countryA: 'RU', countryB: 'TR', type: 'neutral', label: 'Competitive Cooperation' },
  { ...tc('FR', 'DE'), countryA: 'FR', countryB: 'DE', type: 'alliance', label: 'EU Core - Franco-German' },
  { ...tc('GB', 'FR'), countryA: 'GB', countryB: 'FR', type: 'alliance', label: 'NATO - Entente Cordiale' },
]

export const portLocations: PortData[] = [
  { countryCode: 'US', name: 'Los Angeles', lat: 33.74, lng: -118.27, volume: 'major' },
  { countryCode: 'US', name: 'New York/New Jersey', lat: 40.69, lng: -74.04, volume: 'major' },
  { countryCode: 'US', name: 'Houston', lat: 29.75, lng: -95.10, volume: 'major' },
  { countryCode: 'US', name: 'Long Beach', lat: 33.77, lng: -118.22, volume: 'major' },
  { countryCode: 'US', name: 'Savannah', lat: 32.02, lng: -81.15, volume: 'major' },
  { countryCode: 'CN', name: 'Shanghai', lat: 31.39, lng: 121.50, volume: 'major' },
  { countryCode: 'CN', name: 'Shenzhen', lat: 22.50, lng: 113.90, volume: 'major' },
  { countryCode: 'CN', name: 'Ningbo-Zhoushan', lat: 29.87, lng: 122.20, volume: 'major' },
  { countryCode: 'CN', name: 'Guangzhou', lat: 23.10, lng: 113.25, volume: 'major' },
  { countryCode: 'CN', name: 'Qingdao', lat: 36.06, lng: 120.38, volume: 'major' },
  { countryCode: 'SG', name: 'Singapore', lat: 1.27, lng: 103.84, volume: 'major' },
  { countryCode: 'KR', name: 'Busan', lat: 35.10, lng: 129.04, volume: 'major' },
  { countryCode: 'KR', name: 'Incheon', lat: 37.45, lng: 126.60, volume: 'major' },
  { countryCode: 'JP', name: 'Tokyo', lat: 35.65, lng: 139.77, volume: 'major' },
  { countryCode: 'JP', name: 'Yokohama', lat: 35.44, lng: 139.64, volume: 'major' },
  { countryCode: 'JP', name: 'Osaka', lat: 34.65, lng: 135.43, volume: 'major' },
  { countryCode: 'JP', name: 'Nagoya', lat: 35.08, lng: 136.88, volume: 'major' },
  { countryCode: 'NL', name: 'Rotterdam', lat: 51.91, lng: 4.50, volume: 'major' },
  { countryCode: 'AE', name: 'Jebel Ali', lat: 25.01, lng: 55.06, volume: 'major' },
  { countryCode: 'MY', name: 'Port Klang', lat: 3.00, lng: 101.39, volume: 'major' },
  { countryCode: 'MY', name: 'Tanjung Pelepas', lat: 1.37, lng: 103.56, volume: 'major' },
  { countryCode: 'AU', name: 'Port Hedland', lat: -20.31, lng: 118.58, volume: 'major' },
  { countryCode: 'AU', name: 'Sydney', lat: -33.86, lng: 151.21, volume: 'major' },
  { countryCode: 'AU', name: 'Melbourne', lat: -37.82, lng: 144.97, volume: 'major' },
  { countryCode: 'IN', name: 'Mumbai', lat: 18.91, lng: 72.83, volume: 'major' },
  { countryCode: 'IN', name: 'Mundra', lat: 22.84, lng: 69.72, volume: 'major' },
  { countryCode: 'IN', name: 'Chennai', lat: 13.09, lng: 80.29, volume: 'major' },
  { countryCode: 'GB', name: 'Felixstowe', lat: 51.95, lng: 1.35, volume: 'major' },
  { countryCode: 'GB', name: 'Southampton', lat: 50.90, lng: -1.40, volume: 'major' },
  { countryCode: 'DE', name: 'Hamburg', lat: 53.55, lng: 9.97, volume: 'major' },
  { countryCode: 'DE', name: 'Bremen', lat: 53.08, lng: 8.80, volume: 'major' },
  { countryCode: 'BR', name: 'Santos', lat: -23.97, lng: -46.30, volume: 'major' },
  { countryCode: 'BR', name: 'Rio de Janeiro', lat: -22.90, lng: -43.20, volume: 'major' },
  { countryCode: 'BE', name: 'Antwerp', lat: 51.25, lng: 4.40, volume: 'major' },
  { countryCode: 'ES', name: 'Algeciras', lat: 36.13, lng: -5.45, volume: 'major' },
  { countryCode: 'ES', name: 'Barcelona', lat: 41.33, lng: 2.17, volume: 'major' },
  { countryCode: 'IT', name: 'Genoa', lat: 44.40, lng: 8.92, volume: 'major' },
  { countryCode: 'FR', name: 'Marseille', lat: 43.33, lng: 5.37, volume: 'major' },
  { countryCode: 'FR', name: 'Le Havre', lat: 49.49, lng: 0.11, volume: 'major' },
  { countryCode: 'SA', name: 'Jeddah', lat: 21.49, lng: 39.16, volume: 'major' },
  { countryCode: 'EG', name: 'Alexandria', lat: 31.20, lng: 29.92, volume: 'major' },
  { countryCode: 'ZA', name: 'Durban', lat: -29.86, lng: 31.03, volume: 'major' },
  { countryCode: 'ZA', name: 'Cape Town', lat: -33.91, lng: 18.42, volume: 'major' },
  { countryCode: 'ID', name: 'Tanjung Priok', lat: -6.10, lng: 106.88, volume: 'major' },
  { countryCode: 'TH', name: 'Laem Chabang', lat: 13.07, lng: 100.88, volume: 'major' },
  { countryCode: 'VN', name: 'Ho Chi Minh City', lat: 10.77, lng: 106.70, volume: 'major' },
  { countryCode: 'TW', name: 'Kaohsiung', lat: 22.62, lng: 120.27, volume: 'major' },
  { countryCode: 'MX', name: 'Manzanillo', lat: 19.05, lng: -104.32, volume: 'major' },
  { countryCode: 'CA', name: 'Vancouver', lat: 49.29, lng: -123.12, volume: 'major' },
  { countryCode: 'CA', name: 'Prince Rupert', lat: 54.32, lng: -130.33, volume: 'medium' },
  { countryCode: 'NG', name: 'Lagos', lat: 6.43, lng: 3.40, volume: 'major' },
  { countryCode: 'QA', name: 'Hamad', lat: 24.78, lng: 51.56, volume: 'major' },
  { countryCode: 'KW', name: 'Shuwaikh', lat: 29.35, lng: 47.93, volume: 'major' },
  { countryCode: 'IL', name: 'Haifa', lat: 32.82, lng: 34.99, volume: 'major' },
  { countryCode: 'IL', name: 'Ashdod', lat: 31.83, lng: 34.64, volume: 'major' },
  { countryCode: 'KE', name: 'Mombasa', lat: -4.06, lng: 39.66, volume: 'major' },
  { countryCode: 'HK', name: 'Hong Kong', lat: 22.35, lng: 114.11, volume: 'major' },
  { countryCode: 'PH', name: 'Manila', lat: 14.58, lng: 120.96, volume: 'major' },
  { countryCode: 'TR', name: 'Istanbul', lat: 41.00, lng: 28.97, volume: 'major' },
  { countryCode: 'MA', name: 'Tangier', lat: 35.78, lng: -5.81, volume: 'major' },
  { countryCode: 'EG', name: 'Suez Canal', lat: 30.50, lng: 32.55, volume: 'major' },
  { countryCode: 'GR', name: 'Piraeus', lat: 37.94, lng: 23.64, volume: 'major' },
  { countryCode: 'PL', name: 'Gdansk', lat: 54.35, lng: 18.65, volume: 'major' },
  { countryCode: 'PT', name: 'Sines', lat: 37.96, lng: -8.87, volume: 'medium' },
  { countryCode: 'FI', name: 'Helsinki', lat: 60.17, lng: 24.95, volume: 'medium' },
  { countryCode: 'IE', name: 'Dublin', lat: 53.35, lng: -6.20, volume: 'medium' },
  { countryCode: 'MU', name: 'Port Louis', lat: -20.16, lng: 57.50, volume: 'medium' },
  { countryCode: 'NZ', name: 'Auckland', lat: -36.84, lng: 174.76, volume: 'major' },
  { countryCode: 'NZ', name: 'Tauranga', lat: -37.65, lng: 176.17, volume: 'medium' },
]

export function getCountryCoord(code: string) {
  return countryCoords[code]
}

export function getTradeRoutesForCountry(code: string): TradeRoute[] {
  return tradeRoutes.filter(r => r.from === code || r.to === code)
}

export function getMilitaryRelationsForCountry(code: string): MilitaryRelation[] {
  return militaryRelations.filter(r => r.countryA === code || r.countryB === code)
}

export function getPortsForCountry(code: string): PortData[] {
  return portLocations.filter(p => p.countryCode === code)
}

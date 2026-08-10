export interface SupplyChainLink {
  id: string
  fromCountry: string
  toCountry: string
  fromLat: number
  fromLng: number
  toLat: number
  toLng: number
  commodity: string
  volume: string
  criticality: number
  dashLength: number
  dashGap: number
  animateTime: number
  color: string
}

export interface SupplyChainPath {
  id: string
  name: string
  links: SupplyChainLink[]
  totalCriticality: number
  risk: number
}

const countryCoords: Record<string, { lat: number; lng: number }> = {
  US: { lat: 37.09, lng: -95.71 }, CN: { lat: 35.86, lng: 104.19 },
  TW: { lat: 23.70, lng: 120.96 }, JP: { lat: 36.20, lng: 138.25 },
  KR: { lat: 35.91, lng: 127.77 }, DE: { lat: 51.17, lng: 10.45 },
  GB: { lat: 55.38, lng: -3.44 }, FR: { lat: 46.60, lng: 1.89 },
  IN: { lat: 20.59, lng: 78.96 }, SG: { lat: 1.35, lng: 103.82 },
  MY: { lat: 4.21, lng: 101.98 }, VN: { lat: 14.06, lng: 108.28 },
  MX: { lat: 23.63, lng: -102.55 }, BR: { lat: -14.24, lng: -51.93 },
  RU: { lat: 61.52, lng: 105.32 }, SA: { lat: 23.89, lng: 45.08 },
  IR: { lat: 32.43, lng: 53.69 }, AE: { lat: 23.42, lng: 53.85 },
  NL: { lat: 52.13, lng: 5.29 }, AU: { lat: -25.27, lng: 133.77 },
  ID: { lat: -0.79, lng: 113.92 }, NG: { lat: 9.08, lng: 8.68 },
  ZA: { lat: -30.56, lng: 22.94 }, CL: { lat: -35.68, lng: -71.54 },
}

const t = (a: string, b: string) => ({
  fromLat: countryCoords[a]?.lat ?? 0,
  fromLng: countryCoords[a]?.lng ?? 0,
  toLat: countryCoords[b]?.lat ?? 0,
  toLng: countryCoords[b]?.lng ?? 0,
})

export const supplyChainPaths: SupplyChainPath[] = [
  {
    id: 'sc-001',
    name: 'Taiwan Semiconductor → US Tech',
    totalCriticality: 9,
    risk: 7,
    links: [
      {
        id: 'sc-001-a',
        fromCountry: 'TW',
        toCountry: 'KR',
        commodity: 'Semiconductors',
        volume: '$15B/month',
        criticality: 9,
        dashLength: 0.2,
        dashGap: 0.05,
        animateTime: 3000,
        color: '#00d4ff',
        ...t('TW', 'KR'),
      },
      {
        id: 'sc-001-b',
        fromCountry: 'KR',
        toCountry: 'JP',
        commodity: 'Semiconductors',
        volume: '$12B/month',
        criticality: 8,
        dashLength: 0.25,
        dashGap: 0.05,
        animateTime: 3500,
        color: '#00ff88',
        ...t('KR', 'JP'),
      },
      {
        id: 'sc-001-c',
        fromCountry: 'JP',
        toCountry: 'US',
        commodity: 'Electronics',
        volume: '$20B/month',
        criticality: 9,
        dashLength: 0.15,
        dashGap: 0.04,
        animateTime: 4000,
        color: '#00d4ff',
        ...t('JP', 'US'),
      },
    ],
  },
  {
    id: 'sc-002',
    name: 'Gulf Oil → Europe → Global Markets',
    totalCriticality: 10,
    risk: 8,
    links: [
      {
        id: 'sc-002-a',
        fromCountry: 'SA',
        toCountry: 'AE',
        commodity: 'Crude Oil',
        volume: '$8B/month',
        criticality: 10,
        dashLength: 0.2,
        dashGap: 0.06,
        animateTime: 2500,
        color: '#ff8800',
        ...t('SA', 'AE'),
      },
      {
        id: 'sc-002-b',
        fromCountry: 'AE',
        toCountry: 'NL',
        commodity: 'Refined Oil',
        volume: '$6B/month',
        criticality: 9,
        dashLength: 0.25,
        dashGap: 0.05,
        animateTime: 3500,
        color: '#ffaa00',
        ...t('AE', 'NL'),
      },
      {
        id: 'sc-002-c',
        fromCountry: 'NL',
        toCountry: 'DE',
        commodity: 'Petrochemicals',
        volume: '$4B/month',
        criticality: 8,
        dashLength: 0.3,
        dashGap: 0.04,
        animateTime: 2000,
        color: '#ffcc00',
        ...t('NL', 'DE'),
      },
    ],
  },
  {
    id: 'sc-003',
    name: 'China Manufacturing → Global Distribution',
    totalCriticality: 8,
    risk: 6,
    links: [
      {
        id: 'sc-003-a',
        fromCountry: 'CN',
        toCountry: 'SG',
        commodity: 'Electronics',
        volume: '$10B/month',
        criticality: 8,
        dashLength: 0.2,
        dashGap: 0.05,
        animateTime: 3000,
        color: '#00ff88',
        ...t('CN', 'SG'),
      },
      {
        id: 'sc-003-b',
        fromCountry: 'SG',
        toCountry: 'IN',
        commodity: 'Electronics',
        volume: '$5B/month',
        criticality: 7,
        dashLength: 0.25,
        dashGap: 0.06,
        animateTime: 2800,
        color: '#44cc44',
        ...t('SG', 'IN'),
      },
      {
        id: 'sc-003-c',
        fromCountry: 'CN',
        toCountry: 'DE',
        commodity: 'Manufactured Goods',
        volume: '$8B/month',
        criticality: 8,
        dashLength: 0.2,
        dashGap: 0.05,
        animateTime: 3500,
        color: '#00d4ff',
        ...t('CN', 'DE'),
      },
    ],
  },
  {
    id: 'sc-004',
    name: 'Australia Resources → Asia Industry',
    totalCriticality: 7,
    risk: 4,
    links: [
      {
        id: 'sc-004-a',
        fromCountry: 'AU',
        toCountry: 'CN',
        commodity: 'Iron Ore',
        volume: '$12B/month',
        criticality: 9,
        dashLength: 0.3,
        dashGap: 0.08,
        animateTime: 4000,
        color: '#aa8833',
        ...t('AU', 'CN'),
      },
      {
        id: 'sc-004-b',
        fromCountry: 'AU',
        toCountry: 'JP',
        commodity: 'Coal',
        volume: '$6B/month',
        criticality: 7,
        dashLength: 0.3,
        dashGap: 0.07,
        animateTime: 3800,
        color: '#886644',
        ...t('AU', 'JP'),
      },
    ],
  },
  {
    id: 'sc-005',
    name: 'Latin America Agriculture → World',
    totalCriticality: 6,
    risk: 3,
    links: [
      {
        id: 'sc-005-a',
        fromCountry: 'BR',
        toCountry: 'CN',
        commodity: 'Soybeans',
        volume: '$5B/month',
        criticality: 7,
        dashLength: 0.25,
        dashGap: 0.06,
        animateTime: 3200,
        color: '#44bb44',
        ...t('BR', 'CN'),
      },
      {
        id: 'sc-005-b',
        fromCountry: 'MX',
        toCountry: 'US',
        commodity: 'Automotive',
        volume: '$4B/month',
        criticality: 6,
        dashLength: 0.3,
        dashGap: 0.08,
        animateTime: 2500,
        color: '#88cc44',
        ...t('MX', 'US'),
      },
    ],
  },
]

export function getSupplyChainsForCountry(code: string): SupplyChainPath[] {
  return supplyChainPaths.filter(
    p => p.links.some(l => l.fromCountry === code || l.toCountry === code)
  )
}

export function getAllSupplyChainLinks(): SupplyChainLink[] {
  return supplyChainPaths.flatMap(p => p.links)
}

export function getSupplyChainCountries(): string[] {
  const codes = new Set<string>()
  for (const p of supplyChainPaths) {
    for (const l of p.links) {
      codes.add(l.fromCountry)
      codes.add(l.toCountry)
    }
  }
  return Array.from(codes)
}

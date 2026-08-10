export interface GeoEvent {
  id: string
  title: string
  description: string
  type: 'conflict' | 'economic' | 'diplomatic' | 'natural' | 'market' | 'military'
  severity: number
  sentiment: 'positive' | 'neutral' | 'negative'
  lat: number
  lng: number
  countryCode: string
  timestamp: string
  affectedSectors: string[]
  affectedCommodities: string[]
  relatedEvents: string[]
  isHistorical: boolean
}

const now = new Date().toISOString()

export const events: GeoEvent[] = [
  {
    id: 'evt-001',
    title: 'Iran Naval Exercise in Strait of Hormuz',
    description: 'Iran launched a major naval exercise in the Strait of Hormuz, escalating regional tensions.',
    type: 'military',
    severity: 8,
    sentiment: 'negative',
    lat: 26.57,
    lng: 56.0,
    countryCode: 'IR',
    timestamp: now,
    affectedSectors: ['Energy', 'Shipping', 'Defense'],
    affectedCommodities: ['Oil', 'LNG', 'Natural Gas'],
    relatedEvents: ['evt-hist-001', 'evt-hist-002'],
    isHistorical: false,
  },
  {
    id: 'evt-002',
    title: 'Taiwan Semiconductor Supply Disruption',
    description: 'Supply chain disruption in Taiwan semiconductor manufacturing affects global chip production.',
    type: 'economic',
    severity: 7,
    sentiment: 'negative',
    lat: 23.70,
    lng: 120.96,
    countryCode: 'TW',
    timestamp: now,
    affectedSectors: ['Technology', 'Semiconductor', 'Automotive'],
    affectedCommodities: ['Semiconductors', 'Electronics'],
    relatedEvents: [],
    isHistorical: false,
  },
  {
    id: 'evt-003',
    title: 'US Federal Reserve Rate Decision',
    description: 'Federal Reserve announces interest rate decision with market-wide implications.',
    type: 'market',
    severity: 6,
    sentiment: 'neutral',
    lat: 38.90,
    lng: -77.04,
    countryCode: 'US',
    timestamp: now,
    affectedSectors: ['Financial', 'Real Estate', 'Technology'],
    affectedCommodities: ['Gold', 'Bonds'],
    relatedEvents: [],
    isHistorical: false,
  },
  {
    id: 'evt-004',
    title: 'Russia-Europe Gas Pipeline Maintenance',
    description: 'Scheduled maintenance on Nord Stream pipeline reduces European gas flows.',
    type: 'economic',
    severity: 5,
    sentiment: 'negative',
    lat: 54.70,
    lng: 13.70,
    countryCode: 'RU',
    timestamp: now,
    affectedSectors: ['Energy', 'Utilities', 'Industrial'],
    affectedCommodities: ['Natural Gas', 'LNG'],
    relatedEvents: [],
    isHistorical: false,
  },
  {
    id: 'evt-005',
    title: 'China Rare Earth Export Restrictions',
    description: 'China imposes new export controls on rare earth minerals used in tech manufacturing.',
    type: 'economic',
    severity: 7,
    sentiment: 'negative',
    lat: 35.86,
    lng: 104.19,
    countryCode: 'CN',
    timestamp: now,
    affectedSectors: ['Technology', 'Defense', 'Automotive'],
    affectedCommodities: ['Rare Earth', 'Lithium'],
    relatedEvents: [],
    isHistorical: false,
  },
  {
    id: 'evt-006',
    title: 'Saudi Arabia Oil Production Cut',
    description: 'Saudi Arabia announces voluntary oil production cut to stabilize prices.',
    type: 'economic',
    severity: 6,
    sentiment: 'neutral',
    lat: 23.89,
    lng: 45.08,
    countryCode: 'SA',
    timestamp: now,
    affectedSectors: ['Energy', 'Transportation', 'Chemical'],
    affectedCommodities: ['Oil', 'Petrochemicals'],
    relatedEvents: ['evt-hist-003'],
    isHistorical: false,
  },
  {
    id: 'evt-007',
    title: 'India Monsoon Flooding',
    description: 'Severe monsoon flooding disrupts agriculture and supply chains across India.',
    type: 'natural',
    severity: 5,
    sentiment: 'negative',
    lat: 20.59,
    lng: 78.96,
    countryCode: 'IN',
    timestamp: now,
    affectedSectors: ['Agriculture', 'Insurance', 'Logistics'],
    affectedCommodities: ['Rice', 'Cotton', 'Wheat'],
    relatedEvents: [],
    isHistorical: false,
  },
  {
    id: 'evt-008',
    title: 'NATO Eastern Flank Deployment',
    description: 'NATO announces increased military deployment in Eastern European member states.',
    type: 'military',
    severity: 6,
    sentiment: 'negative',
    lat: 52.52,
    lng: 13.41,
    countryCode: 'DE',
    timestamp: now,
    affectedSectors: ['Defense', 'Energy', 'Financial'],
    affectedCommodities: ['Natural Gas', 'Oil'],
    relatedEvents: [],
    isHistorical: false,
  },
  {
    id: 'evt-009',
    title: 'Japan Tech Innovation Summit',
    description: 'Japan hosts major technology innovation summit, announces AI partnership deals.',
    type: 'diplomatic',
    severity: 4,
    sentiment: 'positive',
    lat: 35.68,
    lng: 139.69,
    countryCode: 'JP',
    timestamp: now,
    affectedSectors: ['Technology', 'Semiconductor', 'AI'],
    affectedCommodities: ['Semiconductors', 'Electronics'],
    relatedEvents: [],
    isHistorical: false,
  },
  {
    id: 'evt-010',
    title: 'Brazil Commodities Export Record',
    description: 'Brazil reports record agricultural exports driven by soy and corn demand.',
    type: 'economic',
    severity: 4,
    sentiment: 'positive',
    lat: -14.24,
    lng: -51.93,
    countryCode: 'BR',
    timestamp: now,
    affectedSectors: ['Agriculture', 'Logistics', 'Trade'],
    affectedCommodities: ['Soybeans', 'Corn', 'Beef'],
    relatedEvents: [],
    isHistorical: false,
  },
  {
    id: 'evt-011',
    title: 'Copper Supply Tightens from Chile',
    description: 'Chilean copper mines face production delays due to labor disputes.',
    type: 'economic',
    severity: 5,
    sentiment: 'negative',
    lat: -35.68,
    lng: -71.54,
    countryCode: 'CL',
    timestamp: now,
    affectedSectors: ['Mining', 'Industrial', 'Technology'],
    affectedCommodities: ['Copper'],
    relatedEvents: [],
    isHistorical: false,
  },
  {
    id: 'evt-012',
    title: 'African Continental Trade Agreement',
    description: 'African Union advances continental free trade area implementation.',
    type: 'diplomatic',
    severity: 4,
    sentiment: 'positive',
    lat: -1.29,
    lng: 36.82,
    countryCode: 'KE',
    timestamp: now,
    affectedSectors: ['Trade', 'Logistics', 'Manufacturing'],
    affectedCommodities: ['Oil', 'Gold', 'Agricultural'],
    relatedEvents: [],
    isHistorical: false,
  },
]

export const historicalEvents: GeoEvent[] = [
  {
    id: 'evt-hist-001',
    title: 'Gulf War (1990-1991)',
    description: 'Iraq invaded Kuwait leading to US-led coalition intervention.',
    type: 'conflict',
    severity: 9,
    sentiment: 'negative',
    lat: 33.32,
    lng: 44.39,
    countryCode: 'IQ',
    timestamp: '1990-08-02T00:00:00Z',
    affectedSectors: ['Energy', 'Defense', 'Shipping'],
    affectedCommodities: ['Oil', 'LNG'],
    relatedEvents: [],
    isHistorical: true,
  },
  {
    id: 'evt-hist-002',
    title: 'Strait of Hormuz Crisis (2012)',
    description: 'Iran threatened to blockade the Strait of Hormuz over sanctions.',
    type: 'conflict',
    severity: 8,
    sentiment: 'negative',
    lat: 26.57,
    lng: 56.0,
    countryCode: 'IR',
    timestamp: '2012-01-01T00:00:00Z',
    affectedSectors: ['Energy', 'Shipping', 'Financial'],
    affectedCommodities: ['Oil', 'LNG'],
    relatedEvents: [],
    isHistorical: true,
  },
  {
    id: 'evt-hist-003',
    title: '1973 Oil Crisis',
    description: 'OPEC oil embargo led to global economic shock and energy crisis.',
    type: 'economic',
    severity: 9,
    sentiment: 'negative',
    lat: 24.71,
    lng: 46.68,
    countryCode: 'SA',
    timestamp: '1973-10-01T00:00:00Z',
    affectedSectors: ['Energy', 'Transportation', 'Manufacturing'],
    affectedCommodities: ['Oil', 'Petrochemicals'],
    relatedEvents: [],
    isHistorical: true,
  },
  {
    id: 'evt-hist-004',
    title: 'Yom Kippur War (1973)',
    description: 'Coalition of Arab states led by Egypt and Syria attacked Israel.',
    type: 'conflict',
    severity: 9,
    sentiment: 'negative',
    lat: 31.05,
    lng: 34.85,
    countryCode: 'IL',
    timestamp: '1973-10-06T00:00:00Z',
    affectedSectors: ['Energy', 'Defense', 'Financial'],
    affectedCommodities: ['Oil', 'Gold'],
    relatedEvents: [],
    isHistorical: true,
  },
  {
    id: 'evt-hist-005',
    title: '2008 Financial Crisis',
    description: 'Global financial crisis triggered by US housing market collapse.',
    type: 'market',
    severity: 10,
    sentiment: 'negative',
    lat: 40.71,
    lng: -74.01,
    countryCode: 'US',
    timestamp: '2008-09-15T00:00:00Z',
    affectedSectors: ['Financial', 'Real Estate', 'All'],
    affectedCommodities: ['Gold', 'Oil'],
    relatedEvents: [],
    isHistorical: true,
  },
  {
    id: 'evt-hist-006',
    title: 'Fukushima Disaster (2011)',
    description: 'Earthquake and tsunami caused nuclear meltdown in Japan.',
    type: 'natural',
    severity: 9,
    sentiment: 'negative',
    lat: 37.42,
    lng: 141.03,
    countryCode: 'JP',
    timestamp: '2011-03-11T00:00:00Z',
    affectedSectors: ['Energy', 'Manufacturing', 'Technology'],
    affectedCommodities: ['Uranium', 'Electronics', 'Automobiles'],
    relatedEvents: [],
    isHistorical: true,
  },
  {
    id: 'evt-hist-007',
    title: 'Russia-Ukraine Conflict (2014)',
    description: 'Russia annexed Crimea, triggering Western sanctions.',
    type: 'conflict',
    severity: 8,
    sentiment: 'negative',
    lat: 44.95,
    lng: 34.10,
    countryCode: 'UA',
    timestamp: '2014-02-20T00:00:00Z',
    affectedSectors: ['Energy', 'Defense', 'Agriculture'],
    affectedCommodities: ['Natural Gas', 'Wheat', 'Oil'],
    relatedEvents: [],
    isHistorical: true,
  },
]

export function getEventsByCountry(code: string): GeoEvent[] {
  return events.filter(e => e.countryCode === code)
}

export function getEventsBySector(sector: string): GeoEvent[] {
  return events.filter(e => e.affectedSectors.includes(sector))
}

export function getSimilarEvents(event: GeoEvent): GeoEvent[] {
  const similar: GeoEvent[] = []
  for (const hist of historicalEvents) {
    const sectorOverlap = hist.affectedSectors.some(s => event.affectedSectors.includes(s))
    const commodityOverlap = hist.affectedCommodities.some(c => event.affectedCommodities.includes(c))
    if (sectorOverlap || commodityOverlap) {
      similar.push(hist)
    }
  }
  for (const evt of events) {
    if (evt.id === event.id) continue
    const sectorOverlap = evt.affectedSectors.some(s => event.affectedSectors.includes(s))
    const commodityOverlap = evt.affectedCommodities.some(c => event.affectedCommodities.includes(c))
    if ((sectorOverlap || commodityOverlap) && !similar.find(s => s.id === evt.id)) {
      similar.push(evt)
    }
  }
  return similar.slice(0, 5)
}

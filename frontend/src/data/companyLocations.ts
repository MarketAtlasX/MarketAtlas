/**
 * Company Locations Database
 *
 * Geographical headquarters, state, country, and facility coordinates
 * for major public companies and assets tracked on MarketAtlas.
 */

export interface Facility {
  name: string
  type: 'HQ' | 'Fab' | 'DataCenter' | 'Refinery' | 'Assembly' | 'R&D'
  city: string
  state?: string
  country: string
  lat: number
  lng: number
}

export interface SupplyChainNode {
  target: string
  targetTicker?: string
  relationship: string
  city: string
  country: string
  lat: number
  lng: number
}

export interface CompanyLocation {
  ticker: string
  name: string
  sector: string
  headquarters: {
    city: string
    state?: string
    country: string
    countryCode: string
    address?: string
  }
  coords: {
    lat: number
    lng: number
  }
  description: string
  facilities: Facility[]
  supplyChain: SupplyChainNode[]
}

export const COMPANY_LOCATIONS: Record<string, CompanyLocation> = {
  NVDA: {
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    sector: 'Semiconductors & AI Hardware',
    headquarters: {
      city: 'Santa Clara',
      state: 'California',
      country: 'United States',
      countryCode: 'US',
      address: '2788 San Tomas Expressway',
    },
    coords: { lat: 37.3708, lng: -121.9675 },
    description: 'Leading designer of graphics processing units (GPUs) and AI computing accelerators.',
    facilities: [
      { name: 'Endeavor / Voyager Campus (HQ)', type: 'HQ', city: 'Santa Clara', state: 'California', country: 'United States', lat: 37.3708, lng: -121.9675 },
      { name: 'TSMC Advanced Packaging Hub', type: 'Fab', city: 'Hsinchu', country: 'Taiwan', lat: 24.7736, lng: 121.0180 },
      { name: 'European AI R&D Center', type: 'R&D', city: 'Bristol', country: 'United Kingdom', lat: 51.4545, lng: -2.5879 },
      { name: 'AI Supercomputer Facility', type: 'DataCenter', city: 'Salt Lake City', state: 'Utah', country: 'United States', lat: 40.7608, lng: -111.8910 },
    ],
    supplyChain: [
      { target: 'TSMC Fab 18', targetTicker: 'TSMC', relationship: 'Foundry & 3nm Wafer Fabrication', city: 'Tainan', country: 'Taiwan', lat: 23.1130, lng: 120.3015 },
      { target: 'ASML Photolithography', targetTicker: 'ASML', relationship: 'High-NA EUV Systems Supplier', city: 'Veldhoven', country: 'Netherlands', lat: 51.4172, lng: 5.4125 },
      { target: 'Foxconn AI Server Assembly', relationship: 'HGX/DGX Server Manufacturing', city: 'Zhengzhou', country: 'China', lat: 34.7579, lng: 113.6253 },
      { target: 'SK Hynix Memory Fab', relationship: 'HBM3e High-Bandwidth Memory', city: 'Icheon', country: 'South Korea', lat: 37.2792, lng: 127.4428 },
    ],
  },

  AAPL: {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Consumer Electronics & Cloud Services',
    headquarters: {
      city: 'Cupertino',
      state: 'California',
      country: 'United States',
      countryCode: 'US',
      address: '1 Apple Park Way',
    },
    coords: { lat: 37.3349, lng: -122.0090 },
    description: 'Designer and manufacturer of smartphones, personal computers, tablets, and wearable devices.',
    facilities: [
      { name: 'Apple Park (Global HQ)', type: 'HQ', city: 'Cupertino', state: 'California', country: 'United States', lat: 37.3349, lng: -122.0090 },
      { name: 'European Operations Center', type: 'HQ', city: 'Cork', country: 'Ireland', lat: 51.8985, lng: -8.4756 },
      { name: 'Austin Engineering Campus', type: 'R&D', city: 'Austin', state: 'Texas', country: 'United States', lat: 30.4015, lng: -97.7282 },
    ],
    supplyChain: [
      { target: 'Foxconn iPhone City', relationship: 'Final iPhone Assembly & Testing', city: 'Zhengzhou', country: 'China', lat: 34.7579, lng: 113.6253 },
      { target: 'TSMC Advanced Silicon', targetTicker: 'TSMC', relationship: 'A-Series & M-Series Chip Foundry', city: 'Hsinchu', country: 'Taiwan', lat: 24.7736, lng: 121.0180 },
      { target: 'Pegatron Manufacturing', relationship: 'Smartphone Assembly & Modules', city: 'Chennai', country: 'India', lat: 13.0827, lng: 80.2707 },
    ],
  },

  MSFT: {
    ticker: 'MSFT',
    name: 'Microsoft Corporation',
    sector: 'Cloud Infrastructure & Enterprise Software',
    headquarters: {
      city: 'Redmond',
      state: 'Washington',
      country: 'United States',
      countryCode: 'US',
      address: 'One Microsoft Way',
    },
    coords: { lat: 47.6740, lng: -122.1215 },
    description: 'Global developer of software, consumer hardware, cloud infrastructure, and AI systems.',
    facilities: [
      { name: 'Redmond Campus (HQ)', type: 'HQ', city: 'Redmond', state: 'Washington', country: 'United States', lat: 47.6740, lng: -122.1215 },
      { name: 'Dublin Azure Cloud Center', type: 'DataCenter', city: 'Dublin', country: 'Ireland', lat: 53.3498, lng: -6.2603 },
      { name: 'East US Cloud Mega-Datacenter', type: 'DataCenter', city: 'Boydton', state: 'Virginia', country: 'United States', lat: 36.6668, lng: -78.3883 },
      { name: 'Asia-Pacific R&D Center', type: 'R&D', city: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
    ],
    supplyChain: [
      { target: 'OpenAI Compute Cluster', relationship: 'Strategic AI Partnership & GPU Cloud', city: 'San Francisco', country: 'United States', lat: 37.7749, lng: -122.4194 },
      { target: 'Wistron Cloud Rack Assembly', relationship: 'Server Rack & Hardware Integration', city: 'Taipei', country: 'Taiwan', lat: 25.0330, lng: 121.5654 },
    ],
  },

  TSLA: {
    ticker: 'TSLA',
    name: 'Tesla, Inc.',
    sector: 'Automotive & Clean Energy',
    headquarters: {
      city: 'Austin',
      state: 'Texas',
      country: 'United States',
      countryCode: 'US',
      address: '13101 Harold Green Road',
    },
    coords: { lat: 30.2223, lng: -97.6171 },
    description: 'Electric vehicle manufacturer, battery storage provider, and autonomous driving developer.',
    facilities: [
      { name: 'Giga Texas (Global HQ)', type: 'HQ', city: 'Austin', state: 'Texas', country: 'United States', lat: 30.2223, lng: -97.6171 },
      { name: 'Giga Shanghai', type: 'Assembly', city: 'Shanghai', country: 'China', lat: 30.8732, lng: 121.7761 },
      { name: 'Giga Berlin-Brandenburg', type: 'Assembly', city: 'Grünheide', country: 'Germany', lat: 52.3980, lng: 13.7910 },
      { name: 'Fremont Vehicle Factory', type: 'Assembly', city: 'Fremont', state: 'California', country: 'United States', lat: 37.4940, lng: -121.9440 },
    ],
    supplyChain: [
      { target: 'CATL Lithium Battery Hub', relationship: 'LFP Battery Cell Production', city: 'Ningde', country: 'China', lat: 26.6657, lng: 119.5479 },
      { target: 'Panasonic Battery Cells', relationship: '2170 Cell Production Partnership', city: 'Osaka', country: 'Japan', lat: 34.6937, lng: 135.5023 },
    ],
  },

  AMZN: {
    ticker: 'AMZN',
    name: 'Amazon.com, Inc.',
    sector: 'E-Commerce & AWS Cloud Computing',
    headquarters: {
      city: 'Seattle',
      state: 'Washington',
      country: 'United States',
      countryCode: 'US',
      address: '410 Terry Ave N',
    },
    coords: { lat: 47.6153, lng: -122.3388 },
    description: 'Global electronic commerce titan and market leader in cloud infrastructure services (AWS).',
    facilities: [
      { name: 'Seattle Campus (HQ1)', type: 'HQ', city: 'Seattle', state: 'Washington', country: 'United States', lat: 47.6153, lng: -122.3388 },
      { name: 'Arlington HQ2', type: 'HQ', city: 'Arlington', state: 'Virginia', country: 'United States', lat: 38.8610, lng: -77.0500 },
      { name: 'AWS Frankfurt Cloud Hub', type: 'DataCenter', city: 'Frankfurt', country: 'Germany', lat: 50.1109, lng: 8.6821 },
    ],
    supplyChain: [
      { target: 'Annapurna Labs Silicon Design', relationship: 'Custom Graviton & Trainium AI Silicon', city: 'Tel Aviv', country: 'Israel', lat: 32.0853, lng: 34.7818 },
    ],
  },

  GOOGL: {
    ticker: 'GOOGL',
    name: 'Alphabet Inc.',
    sector: 'Internet Services, AI & Cloud',
    headquarters: {
      city: 'Mountain View',
      state: 'California',
      country: 'United States',
      countryCode: 'US',
      address: '1600 Amphitheatre Parkway',
    },
    coords: { lat: 37.4220, lng: -122.0841 },
    description: 'Holding conglomerate for Google, Google Cloud, DeepMind, Waymo, and YouTube.',
    facilities: [
      { name: 'Googleplex (HQ)', type: 'HQ', city: 'Mountain View', state: 'California', country: 'United States', lat: 37.4220, lng: -122.0841 },
      { name: 'Google DeepMind HQ', type: 'R&D', city: 'London', country: 'United Kingdom', lat: 51.5317, lng: -0.1261 },
      { name: 'Eemshaven Mega-Datacenter', type: 'DataCenter', city: 'Groningen', country: 'Netherlands', lat: 53.4370, lng: 6.8320 },
    ],
    supplyChain: [
      { target: 'Broadcom ASIC Co-Design', targetTicker: 'AVGO', relationship: 'Custom TPU AI Processor Engineering', city: 'San Jose', country: 'United States', lat: 37.3739, lng: -121.9288 },
    ],
  },

  META: {
    ticker: 'META',
    name: 'Meta Platforms, Inc.',
    sector: 'Social Media & Artificial Intelligence',
    headquarters: {
      city: 'Menlo Park',
      state: 'California',
      country: 'United States',
      countryCode: 'US',
      address: '1 Hacker Way',
    },
    coords: { lat: 37.4848, lng: -122.1484 },
    description: 'Operator of Facebook, Instagram, WhatsApp, and developer of Llama AI models.',
    facilities: [
      { name: 'Menlo Park HQ', type: 'HQ', city: 'Menlo Park', state: 'California', country: 'United States', lat: 37.4848, lng: -122.1484 },
      { name: 'Luleå Subarctic Datacenter', type: 'DataCenter', city: 'Luleå', country: 'Sweden', lat: 65.5848, lng: 22.1567 },
    ],
    supplyChain: [
      { target: 'NVIDIA GPU Clusters', targetTicker: 'NVDA', relationship: 'H100/B200 AI Cluster Supply', city: 'Santa Clara', country: 'United States', lat: 37.3708, lng: -121.9675 },
    ],
  },

  XOM: {
    ticker: 'XOM',
    name: 'Exxon Mobil Corporation',
    sector: 'Integrated Oil & Petrochemicals',
    headquarters: {
      city: 'Spring',
      state: 'Texas',
      country: 'United States',
      countryCode: 'US',
      address: '22777 Springwoods Village Parkway',
    },
    coords: { lat: 30.0825, lng: -95.4342 },
    description: 'One of the world\'s largest publicly traded energy providers and chemical manufacturers.',
    facilities: [
      { name: 'Houston Global Campus (HQ)', type: 'HQ', city: 'Spring', state: 'Texas', country: 'United States', lat: 30.0825, lng: -95.4342 },
      { name: 'Baytown Complex (Largest US Refinery)', type: 'Refinery', city: 'Baytown', state: 'Texas', country: 'United States', lat: 29.7430, lng: -95.0116 },
      { name: 'Stabroek Deepwater Operations', type: 'Refinery', city: 'Georgetown', country: 'Guyana', lat: 6.8013, lng: -58.1551 },
      { name: 'Permian Basin Production Basin', type: 'Refinery', city: 'Midland', state: 'Texas', country: 'United States', lat: 31.9974, lng: -102.0779 },
    ],
    supplyChain: [
      { target: 'Ras Laffan LNG Export Terminal', relationship: 'Joint Venture Gas Extraction', city: 'Ras Laffan', country: 'Qatar', lat: 25.9080, lng: 51.5300 },
      { target: 'Rotterdam Fuels Processing', relationship: 'European Distillates Hub', city: 'Rotterdam', country: 'Netherlands', lat: 51.9244, lng: 4.4777 },
    ],
  },

  SHEL: {
    ticker: 'SHEL',
    name: 'Shell plc',
    sector: 'Global Energy & Liquefied Natural Gas',
    headquarters: {
      city: 'London',
      country: 'United Kingdom',
      countryCode: 'GB',
      address: 'Shell Centre, York Road',
    },
    coords: { lat: 51.5033, lng: -0.1175 },
    description: 'Multinational oil and gas supermajor with operations in over 70 countries.',
    facilities: [
      { name: 'Shell Centre (Global HQ)', type: 'HQ', city: 'London', country: 'United Kingdom', lat: 51.5033, lng: -0.1175 },
      { name: 'Pernis Refinery (Largest in Europe)', type: 'Refinery', city: 'Rotterdam', country: 'Netherlands', lat: 51.8885, lng: 4.3850 },
      { name: 'Prelude Floating LNG Terminal', type: 'Refinery', city: 'Broome', country: 'Australia', lat: -17.9644, lng: 122.2304 },
    ],
    supplyChain: [
      { target: 'Bonny Island LNG Terminal', relationship: 'NLNG Export Partnership', city: 'Bonny', country: 'Nigeria', lat: 4.4500, lng: 7.1667 },
    ],
  },

  TSMC: {
    ticker: 'TSMC',
    name: 'Taiwan Semiconductor Manufacturing Co.',
    sector: 'Pure-Play Semiconductor Foundry',
    headquarters: {
      city: 'Hsinchu',
      country: 'Taiwan',
      countryCode: 'TW',
      address: '8, Li-Hsin Rd. 6, Hsinchu Science Park',
    },
    coords: { lat: 24.7736, lng: 121.0180 },
    description: 'The world\'s most valuable chip foundry, manufacturing over 90% of global cutting-edge microchips.',
    facilities: [
      { name: 'Hsinchu Science Park HQ & Fab 12', type: 'HQ', city: 'Hsinchu', country: 'Taiwan', lat: 24.7736, lng: 121.0180 },
      { name: 'Fab 18 (3nm & 5nm Production Hub)', type: 'Fab', city: 'Tainan', country: 'Taiwan', lat: 23.1130, lng: 120.3015 },
      { name: 'Fab 21 Phoenix Complex', type: 'Fab', city: 'Phoenix', state: 'Arizona', country: 'United States', lat: 33.7500, lng: -112.1800 },
      { name: 'JASM Kumamoto Fab', type: 'Fab', city: 'Kumamoto', country: 'Japan', lat: 32.8833, lng: 130.8667 },
    ],
    supplyChain: [
      { target: 'ASML Veldhoven', targetTicker: 'ASML', relationship: 'Extreme Ultraviolet (EUV) Scanners', city: 'Veldhoven', country: 'Netherlands', lat: 51.4172, lng: 5.4125 },
      { target: 'Shin-Etsu Chemical', relationship: 'High-Purity Silicon Ingot Wafers', city: 'Tokyo', country: 'Japan', lat: 35.6895, lng: 139.6917 },
      { target: 'Tokyo Electron Equipment', relationship: 'Coater/Developer Processing Tools', city: 'Minato', country: 'Japan', lat: 35.6600, lng: 139.7300 },
    ],
  },

  ASML: {
    ticker: 'ASML',
    name: 'ASML Holding N.V.',
    sector: 'Semiconductor Lithography Equipment',
    headquarters: {
      city: 'Veldhoven',
      state: 'North Brabant',
      country: 'Netherlands',
      countryCode: 'NL',
      address: 'De Run 6501',
    },
    coords: { lat: 51.4172, lng: 5.4125 },
    description: 'Sole global manufacturer of Extreme Ultraviolet (EUV) photolithography machines required for advanced chips.',
    facilities: [
      { name: 'Veldhoven Global Campus & Assembly', type: 'HQ', city: 'Veldhoven', country: 'Netherlands', lat: 51.4172, lng: 5.4125 },
      { name: 'Zeiss Optical Systems Facility', type: 'R&D', city: 'Oberkochen', country: 'Germany', lat: 48.7833, lng: 10.1000 },
      { name: 'San Diego Cymer Laser Hub', type: 'R&D', city: 'San Diego', state: 'California', country: 'United States', lat: 32.7157, lng: -117.1611 },
    ],
    supplyChain: [
      { target: 'Carl Zeiss SMT Optics', relationship: 'Exclusive Precision Mirrors & Optics', city: 'Oberkochen', country: 'Germany', lat: 48.7833, lng: 10.1000 },
      { target: 'Trumpf Laser Systems', relationship: 'CO2 High-Power Pulsed Lasers', city: 'Ditzingen', country: 'Germany', lat: 48.8260, lng: 9.0660 },
    ],
  },

  GC: {
    ticker: 'GC',
    name: 'Gold (COMEX / London Bullion)',
    sector: 'Monetary Reserve & Safe-Haven Commodity',
    headquarters: {
      city: 'Zurich',
      country: 'Switzerland',
      countryCode: 'CH',
      address: 'Swiss Vault Depository Network',
    },
    coords: { lat: 47.3769, lng: 8.5417 },
    description: 'Global safe-haven asset, central bank reserve currency, and macroeconomic hedge.',
    facilities: [
      { name: 'Swiss Gold Refining Nexus', type: 'Refinery', city: 'Mendrisio', country: 'Switzerland', lat: 45.8700, lng: 8.9800 },
      { name: 'Bank of England Bullion Vaults', type: 'HQ', city: 'London', country: 'United Kingdom', lat: 51.5140, lng: -0.0880 },
      { name: 'Fort Knox Bullion Depository', type: 'HQ', city: 'Fort Knox', state: 'Kentucky', country: 'United States', lat: 37.8833, lng: -85.9650 },
    ],
    supplyChain: [
      { target: 'Nevada Gold Mines Hub', relationship: 'Largest Single Gold Mining Complex', city: 'Elko', country: 'United States', lat: 40.8324, lng: -115.7631 },
      { target: 'Grasberg Copper & Gold Mine', relationship: 'Major Open-Pit Gold Production', city: 'Papua', country: 'Indonesia', lat: -4.0558, lng: 137.1164 },
    ],
  },
}

/** Aliases helper to look up ticker by varied inputs (e.g. TSM -> TSMC) */
const TICKER_ALIASES: Record<string, string> = {
  TSM: 'TSMC',
  GOLD: 'GC',
  GOOG: 'GOOGL',
  NVIDIA: 'NVDA',
  APPLE: 'AAPL',
  MICROSOFT: 'MSFT',
  TESLA: 'TSLA',
  AMAZON: 'AMZN',
  GOOGLE: 'GOOGL',
  EXXON: 'XOM',
  SHELL: 'SHEL',
}

export function resolveCompanyLocation(symbol: string): CompanyLocation | null {
  if (!symbol) return null
  const clean = symbol.trim().toUpperCase()
  const key = TICKER_ALIASES[clean] ?? clean
  return COMPANY_LOCATIONS[key] ?? null
}

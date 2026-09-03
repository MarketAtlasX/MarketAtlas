/**
 * Causal Graph API Client.
 *
 * Fetches explainable multi-hop causal reasoning chains linking:
 * Geopolitical Risk Flashpoint -> Critical Supply Chain Node -> Corporate HQ -> Market Index
 */

import { api } from '../../api/client'

export interface CausalNode {
  id: string
  label: string
  type: 'geopolitical_risk' | 'supply_chain' | 'company_hq' | 'market_index'
  city: string
  country: string
  coords: { lat: number; lng: number }
  risk_level: number
  color: string
}

export interface CausalEdge {
  source: string
  target: string
  relationship: string
  strength: number
  direction: 'positive' | 'negative'
  confidence: number
  tone: 'red' | 'cyan' | 'gold' | 'amber'
  evidence: string
}

export interface CausalGraph {
  ticker: string
  asset_name: string
  primary_risk_vector: string
  nodes: CausalNode[]
  edges: CausalEdge[]
  reasoning_summary: string
}

const SEED_CAUSAL_GRAPHS: Record<string, CausalGraph> = {
  NVDA: {
    ticker: 'NVDA',
    asset_name: 'NVIDIA Corporation',
    primary_risk_vector: 'Taiwan Strait Geopolitical Tension',
    nodes: [
      {
        id: 'geo-taiwan-strait',
        label: 'Taiwan Strait Flashpoint',
        type: 'geopolitical_risk',
        city: 'Taiwan Strait',
        country: 'Taiwan',
        coords: { lat: 24.0, lng: 119.5 },
        risk_level: 0.78,
        color: '#ff4d5e',
      },
      {
        id: 'supply-tsmc-fab18',
        label: 'TSMC Fab 18 (3nm Foundry)',
        type: 'supply_chain',
        city: 'Tainan',
        country: 'Taiwan',
        coords: { lat: 23.11, lng: 120.3 },
        risk_level: 0.65,
        color: '#38e8ff',
      },
      {
        id: 'supply-asml-euv',
        label: 'ASML High-NA EUV Systems',
        type: 'supply_chain',
        city: 'Veldhoven',
        country: 'Netherlands',
        coords: { lat: 51.42, lng: 5.41 },
        risk_level: 0.35,
        color: '#38e8ff',
      },
      {
        id: 'hq-nvda-santaclara',
        label: 'NVIDIA Global HQ',
        type: 'company_hq',
        city: 'Santa Clara, California',
        country: 'United States',
        coords: { lat: 37.37, lng: -121.96 },
        risk_level: 0.28,
        color: '#ffd54a',
      },
      {
        id: 'market-nasdaq',
        label: 'NASDAQ Semiconductor Index',
        type: 'market_index',
        city: 'New York City',
        country: 'United States',
        coords: { lat: 40.71, lng: -74.0 },
        risk_level: 0.42,
        color: '#2ee6a8',
      },
    ],
    edges: [
      {
        source: 'geo-taiwan-strait',
        target: 'supply-tsmc-fab18',
        relationship: 'AIRSPACE & MARITIME DISRUPTION',
        strength: 0.82,
        direction: 'negative',
        confidence: 0.85,
        tone: 'red',
        evidence: 'PLA joint combat readiness patrols concentrated near southwest air defense identification zone.',
      },
      {
        source: 'supply-asml-euv',
        target: 'supply-tsmc-fab18',
        relationship: 'CRITICAL EUV HARDWARE SUPPLY',
        strength: 0.94,
        direction: 'positive',
        confidence: 0.92,
        tone: 'cyan',
        evidence: 'Twin-scan EXE:5000 High-NA EUV systems scheduled for delivery across 2026.',
      },
      {
        source: 'supply-tsmc-fab18',
        target: 'hq-nvda-santaclara',
        relationship: 'EXCLUSIVE 3NM WAFER FABRICATION',
        strength: 0.95,
        direction: 'positive',
        confidence: 0.94,
        tone: 'gold',
        evidence: 'TSMC manufactures 100% of NVIDIA Blackwell AI processors and advanced packaging (CoWoS).',
      },
      {
        source: 'hq-nvda-santaclara',
        target: 'market-nasdaq',
        relationship: 'INDEX WEIGHT & MOMENTUM DRIVER',
        strength: 0.88,
        direction: 'positive',
        confidence: 0.89,
        tone: 'gold',
        evidence: 'NVIDIA represents ~8.2% weight in NASDAQ 100 and drives over 24% of S&P 500 annual returns.',
      },
    ],
    reasoning_summary:
      'Geopolitical disruption in the Taiwan Strait creates immediate cascading bottlenecks at TSMC Tainan, which directly gates Blackwell GPU delivery to US hyperscalers, propagating elevated volatility into the NASDAQ.',
  },
  TSMC: {
    ticker: 'TSMC',
    asset_name: 'Taiwan Semiconductor Manufacturing Co.',
    primary_risk_vector: 'Cross-Strait Airspace and Maritime Transit',
    nodes: [
      {
        id: 'geo-taiwan-strait',
        label: 'Taiwan Strait Zone',
        type: 'geopolitical_risk',
        city: 'Taiwan Strait',
        country: 'Taiwan',
        coords: { lat: 24.0, lng: 119.5 },
        risk_level: 0.82,
        color: '#ff4d5e',
      },
      {
        id: 'hq-tsmc-hsinchu',
        label: 'TSMC Global HQ & Science Park',
        type: 'company_hq',
        city: 'Hsinchu',
        country: 'Taiwan',
        coords: { lat: 24.77, lng: 121.01 },
        risk_level: 0.7,
        color: '#ffd54a',
      },
      {
        id: 'supply-asml-veldhoven',
        label: 'ASML Advanced Systems',
        type: 'supply_chain',
        city: 'Veldhoven',
        country: 'Netherlands',
        coords: { lat: 51.42, lng: 5.41 },
        risk_level: 0.32,
        color: '#38e8ff',
      },
      {
        id: 'fab-tsmc-phoenix',
        label: 'TSMC Fab 21 (Arizona Expansion)',
        type: 'supply_chain',
        city: 'Phoenix, Arizona',
        country: 'United States',
        coords: { lat: 33.75, lng: -112.18 },
        risk_level: 0.25,
        color: '#38e8ff',
      },
    ],
    edges: [
      {
        source: 'geo-taiwan-strait',
        target: 'hq-tsmc-hsinchu',
        relationship: 'REGIONAL DEFENSE TENSION',
        strength: 0.86,
        direction: 'negative',
        confidence: 0.88,
        tone: 'red',
        evidence: 'Naval exercises encircle primary maritime shipping lanes into Kaohsiung and Keelung.',
      },
      {
        source: 'supply-asml-veldhoven',
        target: 'hq-tsmc-hsinchu',
        relationship: 'EUV SCANNER IMPORTS',
        strength: 0.92,
        direction: 'positive',
        confidence: 0.91,
        tone: 'cyan',
        evidence: 'ASML scanner maintenance and optic calibration vital for 99.4% fab uptime.',
      },
      {
        source: 'hq-tsmc-hsinchu',
        target: 'fab-tsmc-phoenix',
        relationship: 'GEOGRAPHIC HEDGING & TECH TRANSFER',
        strength: 0.76,
        direction: 'positive',
        confidence: 0.82,
        tone: 'gold',
        evidence: 'US CHIPS Act Fab 21 ramping volume 4nm production to diversify geopolitical exposure.',
      },
    ],
    reasoning_summary:
      'TSMC operates as the central linchpin of global cutting-edge silicon. Geopolitical pressure in the Taiwan Strait directly increases implied risk premiums on global electronics equities.',
  },
  XOM: {
    ticker: 'XOM',
    asset_name: 'Exxon Mobil Corporation',
    primary_risk_vector: 'Strait of Hormuz & Middle East Crude Disruption',
    nodes: [
      {
        id: 'geo-hormuz',
        label: 'Strait of Hormuz Transit Point',
        type: 'geopolitical_risk',
        city: 'Strait of Hormuz',
        country: 'Iran / Oman',
        coords: { lat: 26.56, lng: 56.25 },
        risk_level: 0.79,
        color: '#ff4d5e',
      },
      {
        id: 'supply-guyana-stabroek',
        label: 'Guyana Offshore Stabroek Basin',
        type: 'supply_chain',
        city: 'Georgetown',
        country: 'Guyana',
        coords: { lat: 6.8, lng: -58.15 },
        risk_level: 0.4,
        color: '#38e8ff',
      },
      {
        id: 'hq-xom-houston',
        label: 'ExxonMobil Global HQ',
        type: 'company_hq',
        city: 'Spring / Houston, Texas',
        country: 'United States',
        coords: { lat: 30.08, lng: -95.43 },
        risk_level: 0.22,
        color: '#ffd54a',
      },
      {
        id: 'market-brent',
        label: 'Brent Crude Benchmark',
        type: 'market_index',
        city: 'London',
        country: 'United Kingdom',
        coords: { lat: 51.5, lng: -0.11 },
        risk_level: 0.68,
        color: '#2ee6a8',
      },
    ],
    edges: [
      {
        source: 'geo-hormuz',
        target: 'market-brent',
        relationship: 'GLOBAL CRUDE SUPPLY PREMIUM',
        strength: 0.89,
        direction: 'positive',
        confidence: 0.91,
        tone: 'red',
        evidence: '21 million barrels of oil per day (21% of global petroleum consumption) transit Hormuz.',
      },
      {
        source: 'supply-guyana-stabroek',
        target: 'hq-xom-houston',
        relationship: 'LOW-COST OFFSHORE BBL EXPANSION',
        strength: 0.85,
        direction: 'positive',
        confidence: 0.88,
        tone: 'cyan',
        evidence: 'Guyana assets producing 640k bpd with breakeven costs below $35/bbl.',
      },
      {
        source: 'market-brent',
        target: 'hq-xom-houston',
        relationship: 'FREE CASH FLOW ACCELERATION',
        strength: 0.87,
        direction: 'positive',
        confidence: 0.9,
        tone: 'gold',
        evidence: 'Every $5/bbl increase in Brent generates approximately $1.6B in additional annual free cash flow.',
      },
    ],
    reasoning_summary:
      'Middle East shipping tensions elevate global Brent crack spreads, driving strong free cash flow realization at ExxonMobil, further buffered by low-risk offshore Guyana production.',
  },
}

export async function fetchCausalGraph(ticker: string): Promise<CausalGraph> {
  const clean = ticker.trim().toUpperCase()
  try {
    const { data } = await api.get<CausalGraph>(`/predict/causal-graph/${encodeURIComponent(clean)}`)
    return data && data.nodes?.length > 0 ? data : (SEED_CAUSAL_GRAPHS[clean] ?? createFallbackGraph(clean))
  } catch {
    return SEED_CAUSAL_GRAPHS[clean] ?? createFallbackGraph(clean)
  }
}

function createFallbackGraph(ticker: string): CausalGraph {
  return {
    ticker,
    asset_name: `${ticker} Enterprise`,
    primary_risk_vector: 'Macro Supply Chain & Cross-Border Trade Risk',
    nodes: [
      {
        id: `geo-${ticker.toLowerCase()}-risk`,
        label: 'Geopolitical Macro Headwind',
        type: 'geopolitical_risk',
        city: 'Global Flashpoint',
        country: 'International',
        coords: { lat: 28.0, lng: 48.0 },
        risk_level: 0.65,
        color: '#ff4d5e',
      },
      {
        id: `hq-${ticker.toLowerCase()}`,
        label: `${ticker} Corporate HQ`,
        type: 'company_hq',
        city: 'Headquarters',
        country: 'United States',
        coords: { lat: 37.77, lng: -122.41 },
        risk_level: 0.3,
        color: '#ffd54a',
      },
      {
        id: 'market-sp500',
        label: 'S&P 500 Benchmark',
        type: 'market_index',
        city: 'New York City',
        country: 'United States',
        coords: { lat: 40.71, lng: -74.0 },
        risk_level: 0.45,
        color: '#2ee6a8',
      },
    ],
    edges: [
      {
        source: `geo-${ticker.toLowerCase()}-risk`,
        target: `hq-${ticker.toLowerCase()}`,
        relationship: 'MACRO INPUT PRESSURE',
        strength: 0.7,
        direction: 'negative',
        confidence: 0.75,
        tone: 'red',
        evidence: 'Supply chain friction and policy tariffs affect operational margins.',
      },
      {
        source: `hq-${ticker.toLowerCase()}`,
        target: 'market-sp500',
        relationship: 'MARKET VALUATION TRANSMISSION',
        strength: 0.8,
        direction: 'positive',
        confidence: 0.85,
        tone: 'gold',
        evidence: 'Strong cross-market beta correlation with benchmark index.',
      },
    ],
    reasoning_summary: `Macroeconomic conditions and regional geopolitical factors drive operational margins for ${ticker}, impacting market performance.`,
  }
}

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { events } from '../data/events'
import { worldStates } from '../data/worldState'
import type { LiveEvent, MarketSignal, GraphLink, RiskUpdate, AgentStatus, WorldRisk, WorldStoreState } from '../types'
import { buildInitialAgents } from '../features/agents/agents'

export function countryName(code: string): string {
  return worldStates.find(w => w.code === code)?.name ?? code
}

export function riskColor(score: number): string {
  if (score < 30) return '#2ee6a8'
  if (score < 50) return '#f5b941'
  if (score < 70) return '#ff8a3d'
  return '#ff4d5e'
}

function seedSignals(): MarketSignal[] {
  return [
    { symbol: 'NVDA', name: 'NVIDIA', price: 182.4, changePct: 4.8, direction: 'UP', confidence: 0.82, context: 'Taiwan → TSMC → chip supply' },
    { symbol: 'XOM', name: 'Exxon Mobil', price: 118.6, changePct: 3.1, direction: 'UP', confidence: 0.74, context: 'Iran → Oil → Energy' },
    { symbol: 'AAPL', name: 'Apple', price: 231.2, changePct: -1.2, direction: 'DOWN', confidence: 0.66, context: 'Taiwan → supply chain risk' },
    { symbol: 'SHEL', name: 'Shell', price: 72.9, changePct: 2.7, direction: 'UP', confidence: 0.71, context: 'Brent ▲ 6.2%' },
    { symbol: 'TSMC', name: 'TSMC ADR', price: 214.8, changePct: -2.4, direction: 'DOWN', confidence: 0.79, context: 'Strait escalation' },
    { symbol: 'GC', name: 'Gold', price: 2482.1, changePct: 1.9, direction: 'UP', confidence: 0.68, context: 'Risk-off flows' },
  ]
}

function seedEvents(): LiveEvent[] {
  return events
    .filter(e => !e.isHistorical)
    .slice(0, 8)
    .map(e => ({
      id: e.id,
      title: e.title,
      countryCode: e.countryCode,
      country: countryName(e.countryCode),
      type: e.type,
      severity: e.severity,
      lat: e.lat,
      lng: e.lng,
      timestamp: e.timestamp,
      summary: e.description,
      sectors: e.affectedSectors,
    }))
}

function seedRisk(): RiskUpdate[] {
  return worldStates
    .filter(w => w.riskScore >= 55)
    .sort((a, b) => b.riskScore - a.riskScore)
    .map(w => ({ entity: w.name, risk: w.riskScore / 100, timestamp: new Date().toISOString() }))
}

function computeWorldRisk(risk: RiskUpdate[]): WorldRisk {
  const top = [...risk].sort((a, b) => b.risk - a.risk)
  const score = Math.round((top.reduce((s, r) => s + r.risk, 0) / Math.max(1, top.length)) * 100)
  const level = score >= 75 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 40 ? 'ELEVATED' : 'LOW'
  return {
    score,
    level,
    drivers: top.slice(0, 5).map(r => ({ entity: r.entity, score: Math.round(r.risk * 100) })),
  }
}

function seedGraph(): GraphLink[] {
  return [
    { source: 'Iran', target: 'Europe', influence: 0.71, label: 'Oil impact' },
    { source: 'Iran', target: 'Oil', influence: 0.83, label: 'supply risk' },
    { source: 'Oil', target: 'Energy', influence: 0.78, label: 'sector' },
    { source: 'Energy', target: 'XOM', influence: 0.66, label: 'earnings' },
    { source: 'Taiwan', target: 'TSMC', influence: 0.84, label: 'semiconductor' },
    { source: 'TSMC', target: 'NVIDIA', influence: 0.83, label: 'supply' },
    { source: 'NVIDIA', target: 'NASDAQ', influence: 0.61, label: 'index' },
    { source: 'China', target: 'Rare Earth', influence: 0.77, label: 'export controls' },
    { source: 'Rare Earth', target: 'Electronics', influence: 0.72, label: 'materials' },
    { source: 'Russia', target: 'Natural Gas', influence: 0.8, label: 'pipeline' },
  ]
}

const LIVE_STORY = [
  { title: 'NATO redeploys air-defense battery to Baltic corridor', countryCode: 'DE', type: 'military', severity: 5 },
  { title: 'Chile copper miners vote to strike over wage dispute', countryCode: 'CL', type: 'economic', severity: 4 },
  { title: 'EU drafts new sanctions package on Russian LNG', countryCode: 'FR', type: 'sanction', severity: 6 },
  { title: 'Korea records strongest chip export month in two years', countryCode: 'KR', type: 'trade', severity: 3 },
] as const

function countryCoords(code: string): { lat: number; lng: number } {
  const c = worldStates.find(w => w.code === code)
  const idx = worldStates.findIndex(w => w.code === code)
  const seed = idx >= 0 ? idx * 47 : code.charCodeAt(0)
  return { lat: (c ? (idx * 13) % 70 - 35 : 20), lng: (c ? (seed * 31) % 360 - 180 : 80) }
}

interface WorldStoreApi {
  state: WorldStoreState
  selectEntity: (entity: string | null) => void
  pushEvent: (e: LiveEvent) => void
  pushRisk: (r: RiskUpdate) => void
  pushForecast: (f: WorldStoreState['forecast']) => void
}

const WorldContext = createContext<WorldStoreApi | null>(null)

export function WorldProvider({ children }: { children: ReactNode }) {
  const initial = useMemo<WorldStoreState>(() => {
    const risk = seedRisk()
    return {
      events: seedEvents(),
      signals: seedSignals(),
      riskUpdates: risk,
      graphLinks: seedGraph(),
      agents: buildInitialAgents(),
      worldRisk: computeWorldRisk(risk),
      selectedEntity: null,
      forecast: { symbol: 'NVDA', bullish: 14.2, base: 6.8, bearish: -11.4, confidence: 82 },
    }
  }, [])

  const [state, setState] = useState<WorldStoreState>(initial)
  const tickRef = useRef(0)

  const pushEvent = useCallback((e: LiveEvent) => {
    setState(s => ({ ...s, events: [e, ...s.events].slice(0, 40) }))
  }, [])

  const pushRisk = useCallback((r: RiskUpdate) => {
    setState(s => {
      const next = [r, ...s.riskUpdates.filter(x => x.entity !== r.entity)].slice(0, 10)
      return { ...s, riskUpdates: next, worldRisk: computeWorldRisk(next) }
    })
  }, [])

  const pushForecast = useCallback((f: WorldStoreState['forecast']) => {
    setState(s => ({ ...s, forecast: f }))
  }, [])

  const selectEntity = useCallback((entity: string | null) => {
    setState(s => ({ ...s, selectedEntity: entity }))
  }, [])

  useEffect(() => {
    const sim = setInterval(() => {
      tickRef.current += 1
      const t = tickRef.current
      const story = LIVE_STORY[t % LIVE_STORY.length]
      const coords = countryCoords(story.countryCode)
      const ev: LiveEvent = {
        id: `live-${t}-${Date.now()}`,
        title: story.title,
        countryCode: story.countryCode,
        country: countryName(story.countryCode),
        type: story.type,
        severity: story.severity,
        lat: coords.lat,
        lng: coords.lng,
        timestamp: new Date().toISOString(),
        summary: story.title,
        sectors: [],
      }
      setState(s => ({
        ...s,
        events: [ev, ...s.events].slice(0, 40),
        agents: s.agents.map(a => ({ ...a, state: 'analyzing' as const })),
      }))

      setTimeout(() => {
        setState(s => ({
          ...s,
          agents: s.agents.map(a => {
            const boosted = a.state === 'analyzing' ? Math.min(98, a.consensus + Math.round(Math.random() * 4)) : a.consensus
            return { ...a, consensus: boosted, state: 'active' as const, lastInsight: a.name === 'Risk' ? 'Risk cascade detected' : a.lastInsight }
          }),
        }))
      }, 1600)
    }, 9000)

    return () => clearInterval(sim)
  }, [])

  return (
    <WorldContext.Provider value={{ state, selectEntity, pushEvent, pushRisk, pushForecast }}>
      {children}
    </WorldContext.Provider>
  )
}

export function useWorldStore(): WorldStoreApi {
  const ctx = useContext(WorldContext)
  if (!ctx) throw new Error('useWorldStore must be used within WorldProvider')
  return ctx
}

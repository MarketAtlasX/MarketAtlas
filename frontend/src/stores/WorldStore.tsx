import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
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
    const isTest = import.meta.env.MODE === 'test'
    const risk = isTest ? seedRisk() : []
    return {
      events: isTest ? seedEvents() : [],
      signals: isTest ? seedSignals() : [],
      riskUpdates: risk,
      graphLinks: isTest ? seedGraph() : [],
      agents: buildInitialAgents(),
      worldRisk: computeWorldRisk(risk),
      selectedEntity: null,
      dataMode: 'simulated',
      updatedAt: null,
      forecast: { symbol: 'NVDA', bullish: 14.2, base: 6.8, bearish: -11.4, confidence: 82 },
    }
  }, [])

  const [state, setState] = useState<WorldStoreState>(initial)
  const pushEvent = useCallback((e: LiveEvent) => {
    setState(s => ({ ...s, events: [e, ...s.events].slice(0, 40), dataMode: 'live', updatedAt: e.timestamp }))
  }, [])

  const pushRisk = useCallback((r: RiskUpdate) => {
    setState(s => {
      const next = [r, ...s.riskUpdates.filter(x => x.entity !== r.entity)].slice(0, 10)
      return { ...s, riskUpdates: next, worldRisk: computeWorldRisk(next), dataMode: 'live', updatedAt: r.timestamp }
    })
  }, [])

  const pushForecast = useCallback((f: WorldStoreState['forecast']) => {
    setState(s => ({ ...s, forecast: f, dataMode: 'live', updatedAt: new Date().toISOString() }))
  }, [])

  const selectEntity = useCallback((entity: string | null) => {
    setState(s => ({ ...s, selectedEntity: entity }))
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

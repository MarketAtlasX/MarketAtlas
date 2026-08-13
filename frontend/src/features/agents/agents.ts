import type { AgentStatus } from '../../types'

export const AGENT_DEFINITIONS: { name: string; role: string; color: string }[] = [
  { name: 'Geopolitical', role: 'State relations, conflict posture', color: '#38e8ff' },
  { name: 'Economic', role: 'Macro, policy, fiscal', color: '#2ee6a8' },
  { name: 'Energy', role: 'Oil, gas, power flows', color: '#f5b941' },
  { name: 'Supply Chain', role: 'Trade links, bottlenecks', color: '#a78bfa' },
  { name: 'Market', role: 'Prices, momentum, flows', color: '#2ee6a8' },
  { name: 'Risk', role: 'Propagation, contagion', color: '#ff4d5e' },
  { name: 'Forecast', role: 'Scenario synthesis', color: '#60a5fa' },
]

export function buildInitialAgents(): AgentStatus[] {
  return AGENT_DEFINITIONS.map(a => ({
    name: a.name,
    state: 'active' as const,
    consensus: 70 + Math.round(Math.random() * 20),
    lastInsight: undefined,
  }))
}

export function agentColor(name: string): string {
  return AGENT_DEFINITIONS.find(a => a.name === name)?.color ?? '#38e8ff'
}

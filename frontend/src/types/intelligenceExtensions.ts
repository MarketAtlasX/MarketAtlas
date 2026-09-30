/**
 * Extended geopolitical intelligence and consensus interfaces.
 */

export interface GeopoliticalRiskFactor {
  id: string
  category: 'sanction' | 'conflict' | 'trade_barrier' | 'supply_choke' | 'cyber'
  severity: number
  region: string
  description: string
  affectedTickers: string[]
}

export interface ConsensusScore {
  bullishRatio: number
  bearishRatio: number
  neutralRatio: number
  agentCount: number
  divergenceIndex: number
}

export interface IntelligenceAlert {
  id: string
  timestamp: string
  headline: string
  source: string
  impactTier: 'low' | 'medium' | 'high' | 'critical'
  tags: string[]
}

export interface InjectedEvent {
  event_type: string
  title: string
  description: string
  countries: string[]
  severity: number
  timestamp?: string
  metadata?: Record<string, unknown>
}

export interface Assumption {
  id: string
  description: string
  probability: number
  category: string
  depends_on: string[]
  is_active: boolean
}

export interface AssumptionGraph {
  assumptions: Record<string, Assumption>
}

export interface Scenario {
  id: string
  title: string
  description: string
  assumptions: AssumptionGraph
  injected_events: InjectedEvent[]
  start_time: string
  duration_days: number
  expected_uncertainty: number
  created_at: string
  tags: string[]
}

export interface ImpactMetric {
  name: string
  value: number
  direction: string
  confidence: number
  reasoning: string
}

export interface AgentReport {
  agent_type: string
  agent_name: string
  summary: string
  impacts: ImpactMetric[]
  confidence: number
  key_risks: string[]
  key_opportunities: string[]
  assumptions_used: string[]
  reasoning_graph: Record<string, unknown>
}

export interface ChiefReport {
  summary: string
  overall_confidence: number
  agent_reports: Record<string, AgentReport>
  consensus_score: number
  key_uncertainties: string[]
  scenario_outlook: string
  recommended_actions: string[]
  sector_winners: string[]
  sector_losers: string[]
  reasoning_synthesis: Record<string, unknown>
}

export interface HorizonResult {
  horizon_days: number
  timestamp: string
  world_state: Record<string, unknown>
  risk_scores: Record<string, number>
  market_impact: Record<string, number>
  confidence: number
  uncertainty: number
  agent_reports: Record<string, unknown>
  reasoning_graph: Record<string, unknown>
}

export interface MonteCarloStats {
  paths_simulated: number
  average_confidence: number
  total_samples: number
  horizons: MonteCarloHorizon[]
}

export interface MonteCarloHorizon {
  horizon_days: number
  samples: number
  risk_score: DistributionStats
  oil_price: DistributionStats
  vix: DistributionStats
  market_impact_percentile: { mean: number; p10: number; p90: number }
}

export interface DistributionStats {
  mean: number
  median: number
  p10: number
  p90: number
  std: number
}

export interface SimulationRun {
  run_id: string
  scenario_id: string
  horizon_results: Record<string, HorizonResult>
  chief_report: ChiefReport
  monte_carlo_stats: MonteCarloStats
  started_at: string
  completed_at: string
  total_paths: number
  average_confidence: number
}

export interface Simulation {
  id: string
  scenario: Scenario
  runs: SimulationRun[]
  episodes: unknown[]
  created_at: string
  status: string
}

export interface SimulationReport {
  report_id: string
  generated_at: string
  simulation_id: string
  status: string
  scenario_summary: ScenarioSummary
  timeline: TimelineSummary
  agent_reports: Record<string, AgentSummary>
  chief_assessment: ChiefAssessment
  confidence_analysis: ConfidenceAnalysis
  assumption_analysis: AssumptionAnalysis
  reasoning_graph: Record<string, unknown>
  monte_carlo: MonteCarloStats
  portfolio_impact: PortfolioSummary
  historical_analogues: HistoricalAnalogue[]
  recommended_actions: string[]
}

export interface ScenarioSummary {
  title: string
  description: string
  start_time: string
  duration_days: number
  event_count: number
  assumption_count: number
  tags: string[]
}

export interface TimelineSummary {
  horizons: number[]
  horizon_count: number
  details: Record<string, TimelineDetail>
}

export interface TimelineDetail {
  confidence: number
  uncertainty: number
  risk_scores: Record<string, number>
  market_impact: Record<string, number>
}

export interface AgentSummary {
  summary: string
  confidence: number
  impacts: ImpactMetric[]
  key_risks: string[]
  key_opportunities: string[]
}

export interface ChiefAssessment {
  summary: string
  overall_confidence: number
  consensus_score: number
  scenario_outlook: string
  recommended_actions: string[]
  sector_winners: string[]
  sector_losers: string[]
  key_uncertainties: string[]
}

export interface ConfidenceAnalysis {
  overall_confidence: number
  chief_confidence: number
  mc_confidence: number
  consensus_score: number
  horizon_confidences: Record<string, HorizonConfidence>
  agent_confidences: Record<string, AgentConfidence>
  uncertainty_trend: string
  confidence_rating: string
}

export interface HorizonConfidence {
  horizon_confidence: number
  uncertainty: number
  signal_quality: number
}

export interface AgentConfidence {
  confidence: number
  impact_count: number
  weight: number
}

export interface AssumptionAnalysis {
  assumptions: Record<string, AssumptionDetail>
  most_sensitive: string | null
  average_probability: number
}

export interface AssumptionDetail {
  probability: number
  is_active: boolean
  downstream_impact: number
  sensitivity: number
  category: string
}

export interface PortfolioSummary {
  summary?: string
  impacts?: ImpactMetric[]
  risks?: string[]
  opportunities?: string[]
  note?: string
}

export interface HistoricalAnalogue {
  event: string
  similarity: string
  relevance: string
  market_impact: string
}

export interface SimulationBranch {
  id: string
  description: string
  probability: number
  is_active: boolean
  alternatives: { label: string; multiplier: number; probability: number }[]
  dependents?: string[]
}

export interface CounterfactualResult {
  counterfactual_id: string
  modifications: Record<string, unknown>[]
  modified_scenario: Scenario
  original_run_id: string
  new_run: SimulationRun
  deltas: Record<string, CounterfactualDelta>
}

export interface CounterfactualDelta {
  confidence_delta: number
  uncertainty_delta: number
  risk_deltas: Record<string, number>
  market_deltas: Record<string, number>
}

export interface Portfolio {
  id: string
  name: string
  allocation: {
    version: number
    allocation: Record<string, number>
  }
  created_at: string
  updated_at: string
}

export interface SectorMetrics {
  return_pct: number
  volatility: number
}

export interface SectorSnapshot {
  version: number
  sectors: Record<string, SectorMetrics>
  snapshot_time?: string
  fallback?: boolean
}

export interface SimulationRunRecord {
  id: string
  portfolio_id: string
  status: string
  scenario: Record<string, unknown>
  result: {
    run_id: string
    simulation_id: string
    status: string
    summary: Record<string, unknown>
    chief_report?: ChiefReport
    portfolio_impact?: PortfolioImpact
  } | null
  error: string | null
  market_snapshot_time: string | null
  sector_data_version: number | null
  created_at: string
  completed_at: string | null
}

export interface PortfolioImpact {
  total_portfolio_impact: number
  sector_contributions: Record<string, {
    allocation: number
    sector_impact: number
    contribution: number
    return_pct?: number
    volatility?: number
  }>
  estimated_volatility: number
  correlation_shift: number
  diversification_benefit: number
  risk_score: number
  horizon_days: number
  summary?: string
  impacts?: ImpactMetric[]
  risks?: string[]
  opportunities?: string[]
}

export interface WSMessage {
  type: string
  [key: string]: unknown
}

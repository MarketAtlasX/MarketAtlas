import { describe, it, expect, vi } from 'vitest'
import { intelligenceBus } from '../services/intelligenceBus'
import { fetchLedger, fetchBacktestMetrics, fetchCalibrationSummary } from '../features/prediction-space/predictionLedgerApi'
import { fetchCausalGraph } from '../features/prediction-space/causalGraphApi'

describe('MarketAtlas Intelligence-Engineering Phase', () => {
  describe('Pillar 1 & 2: Prediction Ledger & Backtesting System', () => {
    it('fetches prediction ledger audit records with realistic maturity evaluations', async () => {
      const records = await fetchLedger()
      expect(Array.isArray(records)).toBe(true)
      expect(records.length).toBeGreaterThanOrEqual(5)

      // Test evaluated records have required quantitative metrics
      const evaluated = records.filter(r => r.status === 'EVALUATED')
      expect(evaluated.length).toBeGreaterThan(0)
      const first = evaluated[0]
      expect(first.brier_score).toBeDefined()
      expect(first.directional_accurate).toBeDefined()
      expect(first.realized_return_pct).toBeDefined()
    })

    it('computes and returns backtesting KPIs', async () => {
      const metrics = await fetchBacktestMetrics()
      expect(metrics.total_evaluated).toBeGreaterThan(0)
      expect(metrics.directional_accuracy_pct).toBeGreaterThan(50)
      expect(metrics.win_rate_pct).toBeGreaterThan(50)
      expect(metrics.mean_brier_score).toBeLessThan(0.3)
      expect(metrics.profit_factor).toBeGreaterThan(1.0)
    })
  })

  describe('Pillar 3: Agent Performance Tracking & Calibration', () => {
    it('returns 5-bucket reliability diagram and agent calibration benchmarks', async () => {
      const cal = await fetchCalibrationSummary()
      expect(cal.calibration_index_pct).toBeGreaterThan(85)
      expect(cal.reliability_curve.length).toBe(5)
      expect(cal.agent_performance).toHaveProperty('GeopoliticalAgent')
      expect(cal.agent_performance).toHaveProperty('ForecastAgent')
      expect(cal.agent_performance).toHaveProperty('HistoricalAgent')
    })
  })

  describe('Pillar 4: Causal Graph Reasoning', () => {
    it('generates multi-hop explainable causal chains for equities', async () => {
      const nvdaGraph = await fetchCausalGraph('NVDA')
      expect(nvdaGraph.ticker).toBe('NVDA')
      expect(nvdaGraph.nodes.length).toBeGreaterThanOrEqual(4)
      expect(nvdaGraph.edges.length).toBeGreaterThanOrEqual(3)

      // Verify node classification
      const nodeTypes = nvdaGraph.nodes.map(n => n.type)
      expect(nodeTypes).toContain('geopolitical_risk')
      expect(nodeTypes).toContain('supply_chain')
      expect(nodeTypes).toContain('company_hq')

      // Verify edge confidence and causal direction
      const edge = nvdaGraph.edges[0]
      expect(edge.strength).toBeGreaterThan(0.5)
      expect(edge.evidence).toBeDefined()
      expect(['red', 'cyan', 'gold', 'amber']).toContain(edge.tone)
    })

    it('falls back gracefully to dynamic causal structure for arbitrary tickers', async () => {
      const graph = await fetchCausalGraph('UNKNOWN_ASSET')
      expect(graph.ticker).toBe('UNKNOWN_ASSET')
      expect(graph.nodes.length).toBeGreaterThanOrEqual(3)
      expect(graph.edges.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Pillar 5: ATLAS Orchestration & Bus Communication', () => {
    it('publishes and subscribes to ATLAS_RESPONSE', () => {
      let received: any = null
      const unsub = intelligenceBus.subscribe(ev => {
        if (ev.type === 'ATLAS_RESPONSE') received = ev.payload
      })

      intelligenceBus.emit('ATLAS_RESPONSE', {
        query: 'What happens to NVDA if Taiwan tensions escalate?',
        response: 'Cascading impact on semiconductor foundry supply.',
        tickers: ['NVDA'],
      })

      expect(received).not.toBeNull()
      expect(received.tickers).toContain('NVDA')
      unsub()
    })

    it('publishes and subscribes to CAUSAL_GRAPH_PROJECTED', () => {
      let receivedGraph: any = null
      const unsub = intelligenceBus.subscribe(ev => {
        if (ev.type === 'CAUSAL_GRAPH_PROJECTED') receivedGraph = ev.payload
      })

      intelligenceBus.emit('CAUSAL_GRAPH_PROJECTED', {
        ticker: 'TSMC',
        asset_name: 'TSMC',
        primary_risk_vector: 'Cross-Strait Airspace',
        nodes: [],
        edges: [],
        reasoning_summary: 'Test summary',
      })

      expect(receivedGraph).not.toBeNull()
      expect(receivedGraph.ticker).toBe('TSMC')
      unsub()
    })

    it('publishes and subscribes to BACKTEST_REQUESTED', () => {
      let triggered = false
      const unsub = intelligenceBus.subscribe(ev => {
        if (ev.type === 'BACKTEST_REQUESTED') triggered = true
      })

      intelligenceBus.emit('BACKTEST_REQUESTED', {})
      expect(triggered).toBe(true)
      unsub()
    })
  })
})

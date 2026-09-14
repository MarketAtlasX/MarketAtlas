import { afterEach, describe, expect, it, vi } from 'vitest'
import { planAtlasRequest } from '../assistant/agent/atlasPlanner'
import { executeAtlasTool, executeAtlasToolAsync, getAtlasTool } from '../assistant/agent/atlasTools'
import type { AtlasState } from '../stores/AtlasStore'

const state: AtlasState = {
  camera: { lat: 18, lng: 18, altitude: 1.92, target: null },
  activeLayer: 'world',
  selectedCountry: null,
  selectedCity: null,
  selectedEvent: null,
  selectedCompany: null,
  highlightedEntities: [],
  tracedRoute: [],
  openPanel: null,
  activeTab: null,
  chartSymbol: null,
  timeframe: '1D',
  search: '',
  watchlist: [],
  analysis: { query: '', status: 'idle', source: null, updatedAt: null, confidence: null, uncertainty: null },
  execution: 'idle',
  lastCommand: null,
  executionSteps: [],
  actionHistory: [],
  latestEvidence: null,
}

describe('Atlas agent control loop', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('plans a Japan request as a globe focus action', () => {
    const plan = planAtlasRequest('Take me to Japan', state)
    expect(plan.steps.map(step => step.tool)).toContain('focus_country')
    expect(plan.steps[0].args.country).toBe('Japan')
  })

  it('plans NVIDIA geopolitical risk as ordered globe, risk, graph, company, and market actions', () => {
    const plan = planAtlasRequest('Show me the geopolitical risks affecting NVIDIA', state)
    expect(plan.steps.map(step => step.tool)).toEqual([
      'focus_country',
      'show_globe_layer',
      'trace_market_impact',
      'select_company',
      'show_stock',
    ])
    expect(plan.steps[0].args.country).toBe('Taiwan')
    expect(plan.steps[3].args.company).toBe('NVIDIA')
    expect(plan.steps[4].args.symbol).toBe('NVDA')
  })

  it('uses canonical context for follow-up company requests', () => {
    const contextualState = { ...state, selectedCountry: 'Taiwan' }
    const plan = planAtlasRequest('Show me the companies affected', contextualState)
    expect(plan.steps.map(step => step.tool)).toContain('show_connections')
    const connectionStep = plan.steps.find(step => step.tool === 'show_connections')
    expect(connectionStep?.args.entity).toBe('Taiwan')
  })

  it('validates and executes registered tools through the command bus', () => {
    expect(getAtlasTool('focus_country')).toBeDefined()
    const result = executeAtlasTool('focus_country', { country: 'Japan' }, {
      currentQuery: 'Show me Japan',
      previousEntity: null,
      selectedCompany: null,
    })
    expect(result.ok).toBe(true)
    expect(result.command?.type).toBe('FOCUS_COUNTRY')
  })

  it('returns an explicit error for invalid tool input', () => {
    const result = executeAtlasTool('focus_country', {}, {
      currentQuery: 'Show me Japan',
      previousEntity: null,
      selectedCompany: null,
    })
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Invalid arguments')
  })

  it('attaches provider-backed evidence to an intelligence tool result', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      status: 'live',
      freshness: 'current',
      provenance: { provider: 'GDELT', observed_at: '2026-09-13T12:00:00Z', confidence: 0.81 },
      sources: [{ source: 'GDELT', url: 'https://example.test/event' }],
      causal_chain: [],
    }), { status: 200 })))
    const result = await executeAtlasToolAsync('analyze_geopolitical_risk', { entity: 'Taiwan' }, {
      currentQuery: 'Why is Taiwan risky?',
      previousEntity: 'Taiwan',
      selectedCompany: null,
    })
    expect(result.ok).toBe(true)
    expect(result.observation?.evidenceBundle).toMatchObject({ status: 'live', freshness: 'current' })
  })

  it('keeps missing evidence explicit', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      status: 'unavailable',
      freshness: 'unknown',
      limitations: ['No persisted provider-backed event matched the request.'],
      evidence: [],
    }), { status: 200 })))
    const result = await executeAtlasToolAsync('trace_market_impact', { entity: 'NVDA' }, {
      currentQuery: 'Why is NVDA exposed?',
      previousEntity: 'NVDA',
      selectedCompany: 'NVIDIA',
    })
    expect(result.ok).toBe(true)
    expect(result.message).toContain('Live evidence unavailable')
    expect(result.observation?.evidenceBundle).toMatchObject({ status: 'unavailable' })
  })
})

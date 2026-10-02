import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, waitFor } from '@testing-library/react'
import {
  AtlasProvider,
  toAtlasContextSnapshot,
  useAtlasStore,
  type AtlasEvidenceState,
  type AtlasState,
} from '../stores/AtlasStore'
import { useEvidenceSelection } from '../features/evidence/useEvidenceSelection'
import {
  answerFromEvidence,
  buildEvidenceBriefing,
  looksLikeEvidenceQuestion,
} from '../features/evidence/evidenceBriefing'
import { runAtlasAgentTurn } from '../api/chatApi'
import { useAtlasAgent, type AtlasExecuteOptions, type AtlasExecution } from '../assistant/agent/useAtlasAgent'
import type { EvidenceObservation } from '../api/evidenceApi'

// The provider transport is mocked so the tests can assert exactly which
// canonical evidence ATLAS grounds each turn and each answer in.
vi.mock('../api/chatApi', async importOriginal => {
  const actual = await importOriginal<typeof import('../api/chatApi')>()
  return { ...actual, runAtlasAgentTurn: vi.fn() }
})

// ── Canonical observations ──────────────────────────────────────────────────

const TAIWAN_OBSERVATION: EvidenceObservation = {
  status: 'live',
  freshness: 'current',
  query: 'Taiwan',
  event: {
    title: 'Taiwan Strait naval drills reported',
    description: 'Regional air traffic was rerouted during live-fire drills.',
    event_type: 'military',
    severity: 'high',
    status: 'reported',
    event_date: '2026-09-30T06:00:00Z',
  },
  entities: ['TSM'],
  countries: ['Taiwan'],
  assets: ['TSM'],
  sources: [
    {
      title: 'Naval drill observed near the strait',
      reference: 'ref-1',
      provider: 'GDELT',
      published_at: '2026-09-30T07:00:00Z',
      url: 'https://example.test/drill',
      relevance: 0.92,
    },
  ],
  impacts: [
    {
      id: 'imp-1',
      entity_name: 'TSMC',
      entity_type: 'company',
      impact_direction: 'negative',
      impact_score: -0.6,
      confidence: 0.74,
      analysis_summary: 'Shipment insurance costs rising.',
      affected_assets: [{ ticker: 'TSM', name: 'TSMC', estimated_move: '-2.4%', time_horizon: '1d' }],
    },
  ],
  market_observations: [
    {
      symbol: 'TSM',
      status: 'provider-backed',
      price: 168.4,
      change_percent: -1.8,
      provider: 'ProviderX',
      timestamp: '2026-10-01T09:30:00Z',
      freshness: 'current',
    },
  ],
  causal_chain: [
    { source: 'Taiwan', source_type: 'geography', target: 'TSM', target_type: 'asset', confidence: 0.7, evidence_ref: 'ref-1' },
  ],
  provenance: { provider: 'TAIWAN-FEED', observed_at: '2026-10-01T00:00:00Z', confidence: 0.81, references: ['ref-1'] },
  confidence: 0.81,
  uncertainty: ['Drill duration is unconfirmed.'],
  provider_status: { events: 'live', market_data: 'live' },
  limitations: ['Normalized from a single feed.'],
}

const SPARSE_OBSERVATION: EvidenceObservation = {
  status: 'unavailable',
  freshness: 'unknown',
  limitations: ['No persisted provider-backed event matched the request.'],
}

const IRAN_OBSERVATION: EvidenceObservation = {
  status: 'stale',
  freshness: 'stale',
  provenance: { provider: 'IRAN-FEED', observed_at: '2026-09-20T00:00:00Z', confidence: 0.55 },
  event: { title: 'Strait transit insurance premiums raised' },
  limitations: ['Quoted from cache.'],
}

const REFRESHED_OBSERVATION: EvidenceObservation = {
  status: 'live',
  freshness: 'current',
  provenance: { provider: 'REFRESH-FEED', observed_at: '2026-10-01T08:00:00Z', confidence: 0.7 },
  event: { title: 'Drills concluded, traffic normalized' },
}

function evidenceState(overrides: Partial<AtlasEvidenceState> & Pick<AtlasEvidenceState, 'selection' | 'status'>): AtlasEvidenceState {
  return { observation: null, error: null, refreshing: false, lastUpdatedAt: null, ...overrides }
}

const TAIWAN_READY = evidenceState({ selection: 'Taiwan', status: 'ready', observation: TAIWAN_OBSERVATION, lastUpdatedAt: '2026-10-01T12:00:00.000Z' })
const IRAN_READY = evidenceState({ selection: 'Iran', status: 'ready', observation: IRAN_OBSERVATION, lastUpdatedAt: '2026-10-01T12:30:00.000Z' })

// ── Harness ─────────────────────────────────────────────────────────────────

let atlasState: AtlasState | null = null
let atlasUpdate: ((patch: Partial<AtlasState>) => void) | null = null
let execute: ((query: string, options?: AtlasExecuteOptions) => Promise<AtlasExecution>) | null = null
let refreshEvidence: (() => void) | null = null

function AgentHarness({ selection }: { selection?: string | null } = {}) {
  const { refresh } = useEvidenceSelection(selection ?? null, { refreshIntervalMs: 0 })
  const { state, update } = useAtlasStore()
  const agent = useAtlasAgent()
  atlasState = state
  atlasUpdate = update
  execute = agent.execute
  refreshEvidence = refresh
  return null
}

function renderAgent(selection?: string | null) {
  return render(
    <AtlasProvider>
      <AgentHarness selection={selection} />
    </AtlasProvider>,
  )
}

function setEvidence(evidence: AtlasEvidenceState) {
  act(() => atlasUpdate!({ evidence }))
}

async function runAgent(query: string, options?: AtlasExecuteOptions): Promise<AtlasExecution> {
  let execution: AtlasExecution | null = null
  await act(async () => {
    execution = await execute!(query, options)
  })
  return execution as unknown as AtlasExecution
}

interface PendingRequest {
  url: string
  resolve: (body: unknown) => void
  reject: (error: Error) => void
}

const pending: PendingRequest[] = []

/**
 * Evidence requests with a `query` parameter are queued so tests control the
 * selection lifecycle; everything else (e.g. fallback tool evidence) returns
 * an explicit unavailable envelope.
 */
function installFetchMock() {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/live-events/observation') && /[?&]query=/.test(url)) {
        return new Promise<Response>((resolve, reject) => {
          pending.push({
            url,
            resolve: body => resolve(new Response(JSON.stringify(body), { status: 200 })),
            reject,
          })
        })
      }
      if (url.includes('/api/live-events/observation')) {
        return Promise.resolve(
          new Response(JSON.stringify({ status: 'unavailable', freshness: 'unknown', limitations: ['No record matched.'] }), { status: 200 }),
        )
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }))
    }),
  )
}

function selectionFromUrl(url: string): string {
  const match = /[?&]query=([^&]+)/.exec(url)
  return match ? decodeURIComponent(match[1]) : ''
}

async function resolveRequestFor(selection: string, body: unknown) {
  await waitFor(() => expect(pending.some(item => selectionFromUrl(item.url) === selection)).toBe(true))
  const index = pending.findIndex(item => selectionFromUrl(item.url) === selection)
  const request = pending[index]
  pending.splice(index, 1)
  request.resolve(body)
}

beforeEach(() => {
  vi.mocked(runAtlasAgentTurn).mockReset().mockRejectedValue(new Error('provider unavailable'))
  installFetchMock()
})

afterEach(() => {
  vi.unstubAllGlobals()
  pending.length = 0
  atlasState = null
  atlasUpdate = null
  execute = null
  refreshEvidence = null
})

// ── Briefing (derived strictly from the canonical observation) ──────────────

describe('canonical evidence briefing', () => {
  it('renders every aspect ATLAS must answer from the exact observation', () => {
    const briefing = buildEvidenceBriefing(TAIWAN_READY)
    expect(briefing).not.toBeNull()
    const text = briefing!.text

    // What happened
    expect(text).toContain('Taiwan Strait naval drills reported')
    expect(text).toContain('type: military')
    expect(text).toContain('Entities: TSM')
    expect(text).toContain('Countries: Taiwan')
    // Sources
    expect(text).toContain('SOURCES (1)')
    expect(text).toContain('Naval drill observed near the strait')
    expect(text).toContain('provider: GDELT')
    expect(text).toContain('https://example.test/drill')
    // Impacts
    expect(text).toContain('entity: TSMC')
    expect(text).toContain('direction: negative')
    expect(text).toContain('confidence: 74%')
    expect(text).toContain('Shipment insurance costs rising.')
    // Assets / markets
    expect(text).toContain('Listed asset: TSM')
    expect(text).toContain('asset: TSM')
    expect(text).toContain('Market: TSM · status: provider-backed')
    expect(text).toContain('price: 168.4')
    // Causal relationships
    expect(text).toContain('CAUSAL RELATIONSHIPS (1)')
    expect(text).toContain('Taiwan (geography) -> TSM (asset)')
    expect(text).toContain('confidence: 70%')
    expect(text).toContain('evidence: ref-1')
    // Recorded links are explicitly distinguished from unsupported inference.
    expect(text).toContain('must be distinguished from unsupported inference')
    expect(text).toContain('not treated as a cause')
    // Freshness / confidence / uncertainty + provenance
    expect(text).toContain('Observation status: live')
    expect(text).toContain('Freshness: current')
    expect(text).toContain('provider: TAIWAN-FEED')
    expect(text).toContain('observed at: 2026-10-01T00:00:00Z')
    expect(text).toContain('confidence: 81%')
    expect(text).toContain('Drill duration is unconfirmed.')
    expect(text).toContain('Normalized from a single feed.')
    expect(text).toContain('events=live, market_data=live')
    expect(briefing!.notEstablished).toHaveLength(0)
  })

  it('states missing information as not established instead of inventing it', () => {
    const briefing = buildEvidenceBriefing(evidenceState({ selection: 'Atlantis', status: 'ready', observation: SPARSE_OBSERVATION }))
    expect(briefing).not.toBeNull()
    const text = briefing!.text

    expect(text).toContain('NOT ESTABLISHED: the evidence does not establish what happened — this observation contains no event record.')
    expect(text).toContain('no source records were returned')
    expect(text).toContain('no impact records were returned')
    expect(text).toContain('no asset or market records were returned')
    expect(text).toContain('no causal links were returned')
    expect(text).toContain('Confidence: NOT PROVIDED')
    expect(text).toContain('provider: NOT PROVIDED')
    expect(text).toContain('observed at: NOT PROVIDED')
    expect(text).toContain('Uncertainty: no uncertainty statements recorded.')
    expect(briefing!.notEstablished).toContain('confidence (not provided)')

    // Nothing is fabricated: no timestamp, confidence, or source appears that
    // the observation itself does not contain.
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}T/)
    expect(text).not.toMatch(/confidence: \d+%/)
    expect(text).not.toContain('http')
  })

  it('returns no briefing when no observation is loaded', () => {
    expect(buildEvidenceBriefing(evidenceState({ selection: 'Iran', status: 'loading' }))).toBeNull()
    expect(buildEvidenceBriefing(evidenceState({ selection: null, status: 'idle' }))).toBeNull()
  })

  it('answers explicitly when there is no observation to ground an answer in', () => {
    expect(answerFromEvidence(evidenceState({ selection: 'Iran', status: 'loading' })))
      .toContain('still loading')
    expect(answerFromEvidence(evidenceState({ selection: 'Iran', status: 'loading' })))
      .toContain('will not substitute an explanation')
    expect(answerFromEvidence(evidenceState({ selection: 'Iran', status: 'error', error: 'network down' })))
      .toContain('network down')
    expect(answerFromEvidence(evidenceState({ selection: 'Iran', status: 'error' })))
      .toContain('evidence cannot establish an answer')
    expect(answerFromEvidence(evidenceState({ selection: null, status: 'idle' })))
      .toContain('No globe selection is active')
  })
})

// ── Grounded answers through the agent (provider unavailable fallback) ──────

describe('evidence-grounded ATLAS answers', () => {
  it('answers an Ask ATLAS evidence request from the exact canonical observation', async () => {
    renderAgent()
    setEvidence(TAIWAN_READY)

    const execution = await runAgent('What does the evidence for Taiwan establish?', { evidenceRequest: true })

    expect(execution.providerBacked).toBe(false)
    const response = execution.response
    expect(response).toContain('Grounded in the canonical evidence currently displayed for "Taiwan" (live · freshness current)')
    // Every required aspect, copied from the observation on screen.
    expect(response).toContain('Taiwan Strait naval drills reported')
    expect(response).toContain('SOURCES (1)')
    expect(response).toContain('provider: GDELT')
    expect(response).toContain('IMPACTS (1)')
    expect(response).toContain('TSMC')
    expect(response).toContain('Market: TSM')
    expect(response).toContain('Taiwan (geography) -> TSM (asset)')
    expect(response).toContain('evidence: ref-1')
    expect(response).toContain('must be distinguished from unsupported inference')
    expect(response).toContain('provider: TAIWAN-FEED')
    expect(response).toContain('observed at: 2026-10-01T00:00:00Z')
    expect(response).toContain('confidence: 81%')
    expect(response).toContain('Drill duration is unconfirmed.')
    expect(response).toContain('Normalized from a single feed.')
    expect(response).toContain('NOT ESTABLISHED BY THIS EVIDENCE')
  })

  it('says the evidence does not establish missing information rather than inventing it', async () => {
    renderAgent()
    setEvidence(evidenceState({ selection: 'Atlantis', status: 'ready', observation: SPARSE_OBSERVATION }))

    const execution = await runAgent('What sources and causal relationships are recorded?', { evidenceRequest: true })

    const response = execution.response
    expect(response).toContain('marked unavailable: the evidence does not establish an answer')
    expect(response).toContain('the evidence does not establish any supporting sources')
    expect(response).toContain('the evidence does not establish causal relationships')
    expect(response).toContain('the evidence does not establish any impacts')
    expect(response).toContain('the evidence does not establish what happened')
    // No fabricated provenance: no provider, timestamp, confidence, or URL.
    expect(response).not.toMatch(/\d{4}-\d{2}-\d{2}T/)
    expect(response).not.toMatch(/confidence: \d+%/)
    expect(response).not.toContain('http')
  })

  it('grounds typed evidence questions even without the Ask ATLAS flag', async () => {
    renderAgent()
    setEvidence(TAIWAN_READY)

    expect(looksLikeEvidenceQuestion('Why did this happen?')).toBe(true)
    const execution = await runAgent('Why did this happen?')

    expect(execution.response).toContain('Taiwan Strait naval drills reported')
    expect(execution.response).toContain('provider: TAIWAN-FEED')
  })

  it('never answers an evidence request from nothing when no selection is active', async () => {
    renderAgent()
    setEvidence(evidenceState({ selection: null, status: 'idle' }))

    const execution = await runAgent('Explain this evidence', { evidenceRequest: true })
    expect(execution.response).toContain('No globe selection is active, so there is no canonical evidence to answer from.')
  })
})

// ── Provider context grounding ──────────────────────────────────────────────

describe('ATLAS provider context', () => {
  it('switches to the new observation on the next turn after a selection change', async () => {
    renderAgent()
    setEvidence(TAIWAN_READY)

    const contexts: Array<Record<string, unknown>> = []
    vi.mocked(runAtlasAgentTurn)
      .mockImplementationOnce(async (_messages, _tools, context) => {
        contexts.push(context)
        // The user changes the globe selection while ATLAS is mid-execution;
        // await the act so the store update is rendered before the next turn.
        await act(async () => {
          atlasUpdate!({ evidence: IRAN_READY })
        })
        return {
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [{ id: 'c1', type: 'function', function: { name: 'focus_country', arguments: '{"country":"Iran"}' } }],
          },
          provider: 'openai',
        }
      })
      .mockImplementationOnce(async (_messages, _tools, context) => {
        contexts.push(context)
        return { message: { role: 'assistant', content: 'Grounded in the current selection.' }, provider: 'openai' }
      })

    // Run the agent without an outer act() so the mid-run selection change
    // (applied inside the mocked turn) flushes to the store before the next
    // provider turn snapshots the context.
    const execution = await execute!('Why is this region at risk?')
    expect(execution.providerBacked).toBe(true)
    expect(execution.response).toBe('Grounded in the current selection.')
    expect(contexts).toHaveLength(2)

    // First turn: the evidence displayed when the question was asked.
    const first = contexts[0] as { evidence: { selection: string | null; briefing: string | null } }
    expect(first.evidence.selection).toBe('Taiwan')
    expect(first.evidence.briefing).toContain('Taiwan Strait naval drills reported')
    expect(first.evidence.briefing).toContain('provider: TAIWAN-FEED')

    // Second turn: immediately the new observation — never the previous entity's.
    const second = contexts[1] as { evidence: { selection: string | null; briefing: string | null; observation: unknown } }
    expect(second.evidence.selection).toBe('Iran')
    expect(second.evidence.briefing).toContain('IRAN-FEED')
    expect(second.evidence.briefing).not.toContain('TAIWAN-FEED')
    expect(second.evidence.briefing).not.toContain('Taiwan Strait')
    expect(JSON.stringify(second.evidence.observation)).not.toContain('TAIWAN-FEED')
  })
})

// ── Refresh and selection lifecycle ─────────────────────────────────────────

describe('evidence refresh and selection changes for ATLAS', () => {
  it('preserves the evidence context during a refresh and adopts the refreshed observation after', async () => {
    renderAgent('Taiwan')
    await resolveRequestFor('Taiwan', TAIWAN_OBSERVATION)
    await waitFor(() => expect(atlasState?.evidence.status).toBe('ready'))

    const before = toAtlasContextSnapshot(atlasState as AtlasState)
    expect(before.evidence.briefing).toContain('provider: TAIWAN-FEED')
    expect(before.latestEvidence?.source).toBe('TAIWAN-FEED')

    // Refresh in place — the current observation (and briefing) stays visible.
    act(() => refreshEvidence!())
    await waitFor(() => expect(atlasState?.evidence.refreshing).toBe(true))
    const during = toAtlasContextSnapshot(atlasState as AtlasState)
    expect(during.evidence.briefing).toContain('Taiwan Strait naval drills reported')
    expect(during.evidence.briefing).toContain('provider: TAIWAN-FEED')
    expect(during.evidence.refreshing).toBe(true)

    await resolveRequestFor('Taiwan', REFRESHED_OBSERVATION)
    await waitFor(() => expect(atlasState?.evidence.refreshing).toBe(false))

    const after = toAtlasContextSnapshot(atlasState as AtlasState)
    expect(after.evidence.briefing).toContain('Drills concluded, traffic normalized')
    expect(after.evidence.briefing).toContain('provider: REFRESH-FEED')
    expect(after.evidence.briefing).not.toContain('TAIWAN-FEED')
    expect(after.latestEvidence?.source).toBe('REFRESH-FEED')

    // The grounded answer follows the refreshed observation as well.
    const execution = await runAgent('What does the evidence show?', { evidenceRequest: true })
    expect(execution.response).toContain('Drills concluded, traffic normalized')
    expect(execution.response).not.toContain('Taiwan Strait naval drills reported')
  })

  it('drops every trace of the previous entity while a new selection loads', async () => {
    const { rerender } = renderAgent('Taiwan')
    await resolveRequestFor('Taiwan', TAIWAN_OBSERVATION)
    await waitFor(() => expect(atlasState?.evidence.status).toBe('ready'))
    expect(toAtlasContextSnapshot(atlasState as AtlasState).evidence.briefing).toContain('TAIWAN-FEED')

    // Mark the store so the assertions below prove the provider (and its
    // evidence state) is preserved across the selection change.
    act(() => atlasUpdate!({ actionHistory: ['kept-across-selection'] }))

    // Change the globe selection; the new observation has not arrived yet.
    rerender(
      <AtlasProvider>
        <AgentHarness selection="Iran" />
      </AtlasProvider>,
    )
    await waitFor(() => expect(atlasState?.evidence.selection).toBe('Iran'))
    expect(atlasState?.evidence.status).toBe('loading')
    expect(atlasState?.actionHistory).toContain('kept-across-selection')

    const loading = toAtlasContextSnapshot(atlasState as AtlasState)
    expect(loading.evidence.briefing).toBeNull()
    expect(loading.latestEvidence).toBeNull()
    expect(JSON.stringify(loading.evidence.observation ?? {})).not.toContain('TAIWAN-FEED')

    // Even mid-load, an Ask ATLAS request states the gap instead of reusing
    // the previous entity's evidence.
    const loadingAnswer = answerFromEvidence(atlasState!.evidence)
    expect(loadingAnswer).toContain('"Iran" is still loading')
    expect(loadingAnswer).not.toContain('TAIWAN-FEED')

    await resolveRequestFor('Iran', IRAN_OBSERVATION)
    await waitFor(() => expect(atlasState?.evidence.status).toBe('ready'))

    const after = toAtlasContextSnapshot(atlasState as AtlasState)
    expect(after.evidence.briefing).toContain('IRAN-FEED')
    expect(after.evidence.briefing).not.toContain('TAIWAN-FEED')
    expect(after.latestEvidence?.source).toBe('IRAN-FEED')

    const execution = await runAgent('What does the evidence establish?', { evidenceRequest: true })
    expect(execution.response).toContain('IRAN-FEED')
    expect(execution.response).toContain('Strait transit insurance premiums raised')
    expect(execution.response).not.toContain('TAIWAN-FEED')
    expect(execution.response).not.toContain('Taiwan Strait naval drills reported')
  })
})

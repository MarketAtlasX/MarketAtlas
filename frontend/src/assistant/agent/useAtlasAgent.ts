import { useCallback } from 'react'
import { runAtlasAgentTurn, type AtlasAgentMessage } from '../../api/chatApi'
import { toAtlasContextSnapshot, useAtlasStore } from '../../stores/AtlasStore'
import { atlasToolSchemas, executeAtlasTool, executeAtlasToolAsync } from './atlasTools'
import { planAtlasRequest, type AtlasPlan } from './atlasPlanner'

export interface AtlasExecution {
  plan: AtlasPlan
  ok: boolean
  messages: string[]
  response: string
  providerBacked: boolean
}

const MAX_TOOL_CALLS = 8
const MAX_EXECUTION_MS = 35000

export function useAtlasAgent() {
  const { state, update } = useAtlasStore()

  const executeFallback = useCallback(async (query: string): Promise<AtlasExecution> => {
    const plan = planAtlasRequest(query, state)
    update({
      execution: 'planning',
      analysis: { ...state.analysis, query, status: 'running' },
      executionSteps: plan.steps.map(step => ({ id: step.id, label: step.label, status: 'pending' })),
    })

    const messages: string[] = []
    let ok = true
    for (const [index, planned] of plan.steps.entries()) {
      update({
        execution: 'executing',
        executionSteps: plan.steps.map((step, stepIndex) => ({
          id: step.id,
          label: step.label,
          status: stepIndex < index ? 'complete' : stepIndex === index ? 'active' : 'pending',
        })),
        lastCommand: planned.label,
        actionHistory: [...state.actionHistory, planned.label].slice(-20),
      })
      await new Promise(resolve => window.setTimeout(resolve, 180))
      const result = executeAtlasTool(planned.tool, planned.args, {
        currentQuery: query,
        previousEntity: state.selectedCountry ?? state.selectedCompany,
        selectedCompany: state.selectedCompany,
      })
      messages.push(result.ok ? result.message : result.error ?? 'Tool failed')
      if (!result.ok) ok = false
    }

    update({
      execution: ok ? 'idle' : 'degraded',
      executionSteps: plan.steps.map(step => ({ id: step.id, label: step.label, status: ok ? 'complete' : 'failed' })),
      analysis: { ...state.analysis, query, status: ok ? 'success' : 'degraded', updatedAt: new Date().toISOString() },
    })
    return { plan, ok, messages, response: plan.responseHint, providerBacked: false }
  }, [state, update])

  const execute = useCallback(async (query: string): Promise<AtlasExecution> => {
    const startedAt = Date.now()
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), MAX_EXECUTION_MS)
    const messages: AtlasAgentMessage[] = [{ role: 'user', content: query }]
    const executedLabels: string[] = []
    let response = ''

    try {
      update({
        execution: 'planning',
        analysis: { ...state.analysis, query, status: 'running' },
        executionSteps: [],
      })

      for (let depth = 0; depth < MAX_TOOL_CALLS && Date.now() - startedAt < MAX_EXECUTION_MS; depth += 1) {
        const turn = await runAtlasAgentTurn(
          messages,
          atlasToolSchemas,
          toAtlasContextSnapshot(state) as unknown as Record<string, unknown>,
          controller.signal,
        )
        const assistant = turn.message
        messages.push(assistant)
        const calls = assistant.tool_calls ?? []
        if (calls.length === 0) {
          response = assistant.content ?? 'Atlas completed the requested analysis.'
          update({ execution: 'idle', analysis: { ...state.analysis, query, status: 'success', source: turn.provider, updatedAt: new Date().toISOString() } })
          return { plan: planAtlasRequest(query, state), ok: true, messages: executedLabels, response, providerBacked: true }
        }

        for (const call of calls) {
          let args: Record<string, unknown>
          try {
            args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>
          } catch {
            args = {}
          }
          const label = `${call.function.name}${Object.keys(args).length ? ` · ${Object.values(args).join(', ')}` : ''}`
          executedLabels.push(label)
          update({
            execution: 'executing',
            lastCommand: label,
            actionHistory: [...state.actionHistory, label].slice(-20),
            executionSteps: executedLabels.map((item, index) => ({ id: `${depth}-${index}`, label: item, status: index === executedLabels.length - 1 ? 'active' : 'complete' })),
          })
          const result = await executeAtlasToolAsync(call.function.name, args, {
            currentQuery: query,
            previousEntity: state.selectedCountry ?? state.selectedCompany,
            selectedCompany: state.selectedCompany,
          }, controller.signal)
          const evidence = result.observation?.evidenceBundle as { status?: 'live' | 'historical' | 'unavailable' | 'degraded'; freshness?: string; provenance?: { provider?: string; observed_at?: string; confidence?: number | null }; limitations?: string[] } | undefined
          if (evidence) {
            update({ latestEvidence: {
              status: evidence.status ?? 'degraded',
              freshness: evidence.freshness ?? 'unknown',
              source: evidence.provenance?.provider ?? null,
              observedAt: evidence.provenance?.observed_at ?? null,
              confidence: evidence.provenance?.confidence ?? null,
              limitations: evidence.limitations ?? [],
            } })
          }
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify({ success: result.ok, message: result.message, observation: result.observation, error: result.error, command: result.command?.type }),
          })
          if (!result.ok) executedLabels.push(`Failed · ${result.error ?? call.function.name}`)
        }
      }
      throw new Error('Atlas execution limit reached')
    } catch (error) {
      const fallback = await executeFallback(query)
      update({ execution: fallback.ok ? 'degraded' : 'error', analysis: { ...state.analysis, query, status: 'degraded', source: 'deterministic-fallback', updatedAt: new Date().toISOString(), uncertainty: error instanceof Error ? error.message : 'Provider unavailable' } })
      return { ...fallback, messages: [...fallback.messages, 'Provider unavailable; deterministic fallback used.'], response: fallback.response, providerBacked: false }
    } finally {
      window.clearTimeout(timeout)
    }
  }, [executeFallback, state, update])

  return { execute }
}

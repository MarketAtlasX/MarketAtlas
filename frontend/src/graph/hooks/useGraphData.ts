import { useState, useEffect, useCallback, useRef } from 'react'
import type { GraphEngineResponse, GraphViewType } from '../types/graphTypes'

const BASE_URL = '/api/graph'

export function useGraphData(viewType: GraphViewType, params: Record<string, string | number> = {}) {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const endpointMap: Record<GraphViewType, string> = {
    forecast: '/forecast',
    causal: '/causal',
    reasoning: '/reasoning',
    confidence: '/confidence',
    all: '/all',
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams()
      for (const [key, val] of Object.entries(params)) {
        query.set(key, String(val))
      }
      const url = `${BASE_URL}${endpointMap[viewType]}?${query.toString()}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: GraphEngineResponse = await res.json()
      setData(json.data || json)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [viewType, JSON.stringify(params)])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

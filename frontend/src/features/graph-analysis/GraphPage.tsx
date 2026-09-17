import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Panel from '../../components/ui/Panel'
import Badge from '../../components/ui/Badge'
import { fetchCanonicalCausalSubgraph, type CanonicalCausalEdge, type CanonicalCausalSubgraph } from '../prediction-space/causalGraphApi'

function edgeLabel(edge: CanonicalCausalEdge, nodes: Map<string, string>): string {
  return `${nodes.get(edge.source) ?? edge.source} -> ${nodes.get(edge.target) ?? edge.target}`
}

export default function GraphPage() {
  const [searchParams] = useSearchParams()
  const requested = (searchParams.get('entity') ?? 'NVDA').toUpperCase()
  const [graph, setGraph] = useState<CanonicalCausalSubgraph | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<CanonicalCausalEdge | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setGraph(null)
    setSelectedEdge(null)
    void fetchCanonicalCausalSubgraph(requested, controller.signal)
      .then(next => {
        setGraph(next)
        setSelectedEdge(next.edges[0] ?? null)
      })
      .catch(() => setGraph({ status: 'unavailable', nodes: [], edges: [], evidence: [], limitations: ['Canonical causal graph unavailable.'] }))
    return () => controller.abort()
  }, [requested])

  const labels = useMemo(() => new Map((graph?.nodes ?? []).map(node => [String(node.id), String(node.label)])), [graph])
  const nodes = graph?.nodes ?? []
  const edges = graph?.edges ?? []

  return (
    <div className="h-full flex flex-col p-4 gap-3 overflow-hidden bg-command">
      <div className="shrink-0">
        <h1 className="text-lg font-semibold tracking-wide text-[var(--text-hi)]">GRAPH ANALYSIS</h1>
        <p className="text-[10px] font-mono text-[var(--text-mid)]">CANONICAL EVIDENCE GRAPH · EVENT · IMPACT · COMPANY · ASSET</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-3 flex-1 min-h-0">
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">
          <Panel title={`CAUSAL MAP · ${requested}`} corners>
            {graph?.status !== 'supported' ? (
              <p className="text-[10px] text-[var(--text-lo)]">{graph?.limitations?.[0] ?? 'Loading canonical evidence...'}</p>
            ) : (
              <div className="space-y-1.5">
                {edges.map((edge, index) => (
                  <button
                    key={`${edge.source}-${edge.target}-${index}`}
                    type="button"
                    onClick={() => setSelectedEdge(edge)}
                    className={`w-full rounded border px-2 py-1.5 text-left text-[10px] transition-colors ${selectedEdge === edge ? 'border-[rgba(56,232,255,0.6)] bg-[rgba(56,232,255,0.1)]' : 'border-[var(--line)] hover:border-[rgba(56,232,255,0.35)]'}`}
                  >
                    <div className="text-[var(--text-hi)]">{edgeLabel(edge, labels)}</div>
                    <div className="mt-0.5 font-mono text-[9px] text-[var(--text-lo)]">{edge.relationship} · {edge.provenance.replace('_', ' ')}</div>
                  </button>
                ))}
              </div>
            )}
          </Panel>

          {selectedEdge && (
            <Panel title="EDGE EVIDENCE" glow="accent" corners>
              <div className="space-y-2">
                <p className="text-[11px] text-[var(--text-hi)]">{edgeLabel(selectedEdge, labels)}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded border border-[var(--line)] p-2">
                    <p className="text-[9px] uppercase tracking-wider text-[var(--text-lo)]">Confidence</p>
                    <p className="font-mono text-lg font-bold text-[var(--positive)]">{selectedEdge.confidence == null ? 'UNKNOWN' : `${(selectedEdge.confidence * 100).toFixed(0)}%`}</p>
                  </div>
                  <div className="rounded border border-[var(--line)] p-2">
                    <p className="text-[9px] uppercase tracking-wider text-[var(--text-lo)]">Status</p>
                    <p className="font-mono text-[11px] font-bold text-[var(--accent)]">{selectedEdge.status.toUpperCase()}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge tone="neutral">{selectedEdge.provenance.replace('_', ' ')}</Badge>
                  {selectedEdge.provider && <Badge tone="neutral">{selectedEdge.provider}</Badge>}
                  {selectedEdge.evidence_reference && <Badge tone="neutral">REF {selectedEdge.evidence_reference}</Badge>}
                </div>
                <p className="text-[9px] text-[var(--text-lo)]">Observed: {selectedEdge.observed_at ?? 'UNKNOWN'}</p>
              </div>
            </Panel>
          )}
        </div>

        <Panel title="CANONICAL INTELLIGENCE SUBGRAPH" corners>
          {graph?.status !== 'supported' ? (
            <div className="flex h-full items-center justify-center text-[10px] text-[var(--text-lo)]">{graph?.limitations?.[0] ?? 'Loading canonical evidence...'}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 overflow-y-auto">
              {nodes.map(node => (
                <div key={String(node.id)} className="rounded border border-[var(--line)] bg-[rgba(11,22,33,0.5)] p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[var(--text-hi)]">{String(node.label)}</span>
                    <Badge tone="neutral">{String(node.type)}</Badge>
                  </div>
                  <p className="mt-1 text-[9px] font-mono text-[var(--text-lo)]">{String(node.id)}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

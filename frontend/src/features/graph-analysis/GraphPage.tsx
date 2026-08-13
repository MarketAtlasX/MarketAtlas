import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowDown } from 'lucide-react'
import { IntelligenceGraphPanel } from '../../graph'
import Panel from '../../components/ui/Panel'
import Badge from '../../components/ui/Badge'

interface EdgeDef {
  source: string
  target: string
  influence: number
  confidence: number
  evidence: string[]
}

const NODES = [
  { id: 'TAIWAN', x: 120, y: 20, tone: 'event' },
  { id: 'TSMC', x: 120, y: 110, tone: 'company' },
  { id: 'NVIDIA', x: 45, y: 200, tone: 'company' },
  { id: 'APPLE', x: 195, y: 200, tone: 'company' },
  { id: 'NASDAQ', x: 45, y: 290, tone: 'asset' },
  { id: 'AAPL', x: 195, y: 290, tone: 'asset' },
] as const

const EDGES: EdgeDef[] = [
  {
    source: 'TAIWAN',
    target: 'TSMC',
    influence: 0.91,
    confidence: 0.95,
    evidence: ['geographic dependency', 'export concentration', 'water/energy constraints'],
  },
  {
    source: 'TSMC',
    target: 'NVIDIA',
    influence: 0.83,
    confidence: 0.91,
    evidence: ['semiconductor dependency', 'historical disruption', 'current capacity data'],
  },
  {
    source: 'TSMC',
    target: 'APPLE',
    influence: 0.76,
    confidence: 0.88,
    evidence: ['foundry customer', 'A-series supply', 'diversification signal'],
  },
  {
    source: 'NVIDIA',
    target: 'NASDAQ',
    influence: 0.61,
    confidence: 0.74,
    evidence: ['index weight', 'AI sentiment beta', 'correlation 0.68'],
  },
  {
    source: 'APPLE',
    target: 'AAPL',
    influence: 0.72,
    confidence: 0.81,
    evidence: ['single-entity linkage', 'revenue concentration'],
  },
]

const TONE_COLOR: Record<string, string> = {
  event: '#ff4d5e',
  company: '#38e8ff',
  asset: '#2ee6a8',
}

const ENTITY_TO_NODE: Record<string, string> = {
  NVDA: 'NVIDIA',
  AAPL: 'APPLE',
  TSMC: 'TSMC',
  APPLE: 'APPLE',
  NVIDIA: 'NVIDIA',
}

function MiniGraph({ onEdge }: { onEdge: (e: EdgeDef) => void }) {
  return (
    <svg viewBox="0 0 240 320" className="w-full">
      {EDGES.map((e, i) => {
        const a = NODES.find(n => n.id === e.source)!
        const b = NODES.find(n => n.id === e.target)!
        const midY = (a.y + b.y) / 2
        return (
          <g key={i} onClick={() => onEdge(e)} className="cursor-pointer">
            <line x1={a.x} y1={a.y + 12} x2={b.x} y2={b.y - 12} stroke="rgba(56,232,255,0.45)" strokeWidth={1.5} />
            <rect x={a.x - 10} y={midY - 7} width={20} height={14} rx={3} fill="rgba(6,12,18,0.9)" stroke="rgba(56,232,255,0.35)" />
            <text x={a.x} y={midY + 3} textAnchor="middle" fill="var(--accent)" fontSize={7} fontFamily="var(--font-mono)">
              {e.influence.toFixed(2)}
            </text>
          </g>
        )
      })}
      {NODES.map(n => (
        <g key={n.id}>
          <rect x={n.x - 38} y={n.y} width={76} height={24} rx={6} fill="rgba(11,22,33,0.85)" stroke={TONE_COLOR[n.tone]} strokeWidth={1} />
          <text x={n.x} y={n.y + 16} textAnchor="middle" fill="var(--text-hi)" fontSize={10} fontWeight={600} fontFamily="var(--font-mono)">
            {n.id}
          </text>
        </g>
      ))}
    </svg>
  )
}

export default function GraphPage() {
  const [searchParams] = useSearchParams()
  const entityParam = searchParams.get('entity')
  const requestedNode = entityParam ? ENTITY_TO_NODE[entityParam.toUpperCase()] ?? entityParam.toUpperCase() : null
  const [selectedEdge, setSelectedEdge] = useState<EdgeDef>(() => {
    if (!requestedNode) return EDGES[1]
    return EDGES.find(e => e.source === requestedNode || e.target === requestedNode) ?? EDGES[1]
  })
  const ticker = /^[A-Z]{1,5}$/.test((entityParam ?? '').toUpperCase()) ? entityParam!.toUpperCase() : 'NVDA'

  return (
    <div className="h-full flex flex-col p-4 gap-3 overflow-hidden bg-command">
      <div className="shrink-0">
        <h1 className="text-lg font-semibold tracking-wide text-[var(--text-hi)]">GRAPH ANALYSIS</h1>
        <p className="text-[10px] font-mono text-[var(--text-mid)]">CAUSAL KNOWLEDGE GRAPH — INFLUENCE, CONFIDENCE & EVIDENCE</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-3 flex-1 min-h-0">
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">
          <Panel title="Causal Map" corners>
            <MiniGraph onEdge={setSelectedEdge} />
          </Panel>

          <Panel title={`EDGE :: ${selectedEdge.source} → ${selectedEdge.target}`} glow="accent" corners>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded border border-[var(--line)] p-2">
                  <p className="text-[9px] uppercase tracking-wider text-[var(--text-lo)]">Influence</p>
                  <p className="font-mono text-lg font-bold text-[var(--accent)]">{selectedEdge.influence.toFixed(2)}</p>
                </div>
                <div className="rounded border border-[var(--line)] p-2">
                  <p className="text-[9px] uppercase tracking-wider text-[var(--text-lo)]">Confidence</p>
                  <p className="font-mono text-lg font-bold text-[var(--positive)]">{(selectedEdge.confidence * 100).toFixed(0)}%</p>
                </div>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-[var(--text-mid)] mb-1">Evidence</p>
                <div className="flex flex-wrap gap-1">
                  {selectedEdge.evidence.map(e => (
                    <Badge key={e} tone="neutral">{e}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </div>

        <div className="min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="panel-title">FOUR-GRAPH INTELLIGENCE SYSTEM</span>
            <span className="text-[9px] font-mono text-[var(--text-lo)]">FORECAST · CAUSAL · REASONING · CONFIDENCE</span>
          </div>
          <div className="flex-1 min-h-0">
            <IntelligenceGraphPanel
              symbol={ticker}
              companyName="NVIDIA Corporation"
              currentPrice={182.4}
              rootEvent={selectedEdge.source}
              targetAsset={selectedEdge.target}
              useRealtime
            />
          </div>
        </div>
      </div>
    </div>
  )
}

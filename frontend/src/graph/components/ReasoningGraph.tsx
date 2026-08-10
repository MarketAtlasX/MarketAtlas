import { useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { ReasoningGraph } from '../types/graphTypes'
import { hierarchicalLayout, toReactFlowNodes, toReactFlowEdges, getNodeColor } from '../layouts/graphLayouts'

interface Props {
  data: ReasoningGraph | null
}

const sentimentColors: Record<string, string> = {
  bullish: '#22c55e',
  bearish: '#ef4444',
  neutral: '#64748b',
}

function AgentNode({ data: nodeData }: NodeProps) {
  const d = nodeData as { label?: string; type?: string; confidence?: number; value?: number; metadata?: Record<string, unknown> }
  const sentiment = (d.metadata?.sentiment as string) ?? 'neutral'
  const color = sentimentColors[sentiment] ?? '#64748b'
  return (
    <div
      className="px-3 py-2 rounded-lg border-2 shadow-lg backdrop-blur-sm"
      style={{
        borderColor: color,
        background: `${color}15`,
        minWidth: 140,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color }} />
      <div className="flex flex-col items-center gap-1">
        <span
          className="text-[10px] font-medium uppercase tracking-wider"
          style={{ color }}
        >
          {d.type as string}
        </span>
        <span className="text-xs font-semibold text-gray-200">{d.label as string}</span>
        <div className="flex items-center gap-2 mt-1">
          <div
            className="h-1.5 rounded-full bg-gray-700 overflow-hidden flex-1 w-full"
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${((d.confidence as number) ?? 0) * 100}%`,
                background: color,
              }}
            />
          </div>
          <span className="text-[10px] font-mono" style={{ color }}>
            {((d.confidence as number) ?? 0) > 0 ? `${((d.confidence as number) * 100).toFixed(0)}%` : ''}
          </span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
    </div>
  )
}

function ForecastNode({ data: nodeData }: NodeProps) {
  const d = nodeData as { label?: string }
  return (
    <div
      className="px-4 py-3 rounded-xl border-2 shadow-xl backdrop-blur-sm"
      style={{
        borderColor: '#6366f1',
        background: '#6366f120',
        minWidth: 120,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#6366f1' }} />
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-indigo-400">Consensus</span>
        <span className="text-sm font-bold text-gray-200">{d.label as string}</span>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#6366f1' }} />
    </div>
  )
}

const nodeTypes = { custom: AgentNode, forecast: ForecastNode }

export default function ReasoningGraph({ data }: Props) {
  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    if (!data?.graph) return { nodes: [], edges: [] }
    const g = data.graph
    const positions = hierarchicalLayout(g.nodes, g.edges)
    return {
      nodes: toReactFlowNodes(g.nodes, positions, 'reasoning').map(n => {
        const isForecast = n.data.type === 'forecast'
        return { ...n, type: isForecast ? 'forecast' : 'custom' }
      }) as any[],
      edges: toReactFlowEdges(g.edges) as any[],
    }
  }, [data])

  const [nodes, , onNodesChange] = useNodesState(flowNodes)
  const [edges, , onEdgesChange] = useEdgesState(flowEdges)

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        <div className="flex flex-col items-center gap-2">
          <svg className="animate-spin h-6 w-6 text-indigo-400" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>No agent reasoning data available</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      {data.consensus && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
          <span className="text-xs text-gray-400">Consensus:</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              data.consensus === 'BUY'
                ? 'bg-green-500/20 text-green-400'
                : data.consensus === 'SELL'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-gray-500/20 text-gray-400'
            }`}
          >
            {data.consensus} ({(data.consensus_confidence * 100).toFixed(0)}%)
          </span>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.3}
        maxZoom={2}
        attributionPosition="bottom-left"
      >
        <Background color="#334155" gap={16} />
        <Controls className="dark:bg-gray-800 dark:text-white" />
        <MiniMap className="dark:bg-gray-900" nodeColor={() => '#6366f1'} />
      </ReactFlow>
    </div>
  )
}

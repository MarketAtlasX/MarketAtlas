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
import type { CausalGraph } from '../types/graphTypes'
import { hierarchicalLayout, toReactFlowNodes, toReactFlowEdges, getNodeColor } from '../layouts/graphLayouts'

interface Props {
  data: CausalGraph | null
}

function CustomNode({ data: nodeData }: NodeProps) {
  const d = nodeData as { label?: string; type?: string; confidence?: number; value?: number; risk?: number; metadata?: Record<string, unknown> }
  const color = getNodeColor(d.type ?? 'concept')
  return (
    <div
      className="px-3 py-2 rounded-lg border-2 shadow-lg backdrop-blur-sm"
      style={{
        borderColor: color,
        background: `${color}15`,
        minWidth: 100,
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
        {(d.confidence != null) && (
          <span className="text-[10px] text-gray-400">
            {(d.confidence as number) > 0 ? `${((d.confidence as number) * 100).toFixed(0)}%` : ''}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
    </div>
  )
}

const nodeTypes = { custom: CustomNode }

export default function CausalGraph({ data }: Props) {
  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    if (!data?.combined_graph) return { nodes: [], edges: [] }
    const cg = data.combined_graph
    const positions = hierarchicalLayout(cg.nodes, cg.edges)
    return {
      nodes: toReactFlowNodes(cg.nodes, positions, 'causal') as any[],
      edges: toReactFlowEdges(cg.edges) as any[],
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
          <span>Select an event and asset to see causal paths</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      {data.ranked_paths && data.paths && (
        <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1">
          {data.ranked_paths.slice(0, 3).map((idx: number, i: number) => {
            const path = data.paths[idx]
            if (!path) return null
            return (
              <div
                key={idx}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{
                  background: i === 0 ? '#6366f160' : i === 1 ? '#8b5cf660' : '#f59e0b60',
                  color: i === 0 ? '#a5b4fc' : i === 1 ? '#c4b5fd' : '#fde68a',
                }}
              >
                Path #{i + 1}: {(path.strength * 100).toFixed(0)}% confidence
              </div>
            )
          })}
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
        <MiniMap
          className="dark:bg-gray-900"
          nodeColor={(n) => getNodeColor((n.data as any)?.type ?? 'concept')}
        />
      </ReactFlow>
    </div>
  )
}

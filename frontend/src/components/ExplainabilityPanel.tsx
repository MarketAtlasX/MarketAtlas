import { getCausalPath, defaultGraph } from '../data/graphData'
import { X, ArrowDown } from 'lucide-react'

interface ExplainabilityPanelProps {
  sourceId: string
  targetId?: string
  onClose: () => void
}

const typeColors: Record<string, string> = {
  country: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  commodity: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  sector: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  asset: 'bg-green-500/20 text-green-300 border-green-500/30',
  event: 'bg-red-500/20 text-red-300 border-red-500/30',
}

export default function ExplainabilityPanel({ sourceId, targetId, onClose }: ExplainabilityPanelProps) {
  const target = targetId || 'SPY'
  const path = getCausalPath(sourceId, target)

  const pathNodes: { id: string; label: string; type: string }[] = []
  if (path.length > 0) {
    pathNodes.push({
      id: path[0].source,
      label: defaultGraph.nodes.find(n => n.id === path[0].source)?.label || path[0].source,
      type: defaultGraph.nodes.find(n => n.id === path[0].source)?.type || 'country',
    })
    for (const edge of path) {
      pathNodes.push({
        id: edge.target,
        label: defaultGraph.nodes.find(n => n.id === edge.target)?.label || edge.target,
        type: defaultGraph.nodes.find(n => n.id === edge.target)?.type || 'commodity',
      })
    }
  }

  return (
    <div className="absolute top-4 right-4 z-30 w-80 bg-gray-900/95 backdrop-blur-md rounded-xl border border-gray-700/50 shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-gray-700/50">
        <h3 className="text-xs font-semibold text-gray-200 uppercase tracking-wider">Reasoning Chain</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="p-3">
        <p className="text-[10px] text-gray-400 mb-3">
          Neo4j causal path from <span className="text-blue-300">{sourceId}</span> to <span className="text-green-300">{target}</span>
        </p>

        {pathNodes.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-xs">
            No direct causal path found
            <p className="text-[10px] mt-1 text-gray-600">Try selecting a different country or asset</p>
          </div>
        ) : (
          <div className="space-y-1">
            {pathNodes.map((node, idx) => (
              <div key={node.id}>
                <div className={`px-3 py-2 rounded-lg border text-xs font-medium ${typeColors[node.type] || 'bg-gray-700/30 text-gray-300'}`}>
                  <span className="text-[10px] opacity-60 uppercase mr-1">{node.type}</span>
                  {node.label}
                </div>
                {idx < pathNodes.length - 1 && (
                  <div className="flex justify-center py-0.5">
                    <ArrowDown size={12} className="text-gray-500" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {path.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-700/30">
            <p className="text-[10px] text-gray-400 mb-2">Relationships:</p>
            <div className="space-y-1">
              {path.map((edge, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[10px] text-gray-400">
                  <span className="text-gray-500">{edge.source}</span>
                  <span className="text-cyan-400/60 text-[8px]">{edge.label}</span>
                  <span className="text-gray-500">{edge.target}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

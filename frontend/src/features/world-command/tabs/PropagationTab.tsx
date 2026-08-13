import { useMemo } from 'react'
import { ArrowRight } from 'lucide-react'
import { useWorldStore } from '../../../stores/WorldStore'

export default function PropagationTab() {
  const { state } = useWorldStore()

  const chains = useMemo(() => {
    const sorted = [...state.graphLinks].sort((a, b) => b.influence - a.influence)
    const top = sorted.slice(0, 4)
    const grouped: string[][] = []
    for (const link of top) {
      const tail = grouped.find(g => g[g.length - 1] === link.source)
      if (tail) {
        tail.push(link.target)
      } else {
        grouped.push([link.source, link.target])
      }
    }
    return grouped
  }, [state.graphLinks])

  return (
    <div className="h-full flex items-center gap-6 overflow-x-auto px-1">
      {chains.map((chain, i) => (
        <div key={i} className="flex items-center gap-2 flex-shrink-0">
          {chain.map((node, j) => {
            const isLast = j === chain.length - 1
            const link = state.graphLinks.find(
              l => (l.source === node && l.target === chain[j + 1]) || (j > 0 && l.source === chain[j - 1] && l.target === node),
            )
            return (
              <div key={node} className="flex items-center gap-2">
                <div className="px-2.5 py-1.5 rounded border border-[var(--line)] bg-[rgba(11,22,33,0.6)]">
                  <span className="text-[11px] font-medium text-[var(--text-hi)]">{node}</span>
                  {link && (
                    <span className="ml-2 font-mono text-[9px] text-[var(--accent)]">{link.influence.toFixed(2)}</span>
                  )}
                </div>
                {!isLast && (
                  <div className="flex flex-col items-center">
                    <ArrowRight size={13} className="text-[var(--accent)] animate-pulse" />
                    <span className="text-[8px] font-mono text-[var(--text-lo)]">{link?.label}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {state.riskUpdates.length > 0 && (
        <div className="ml-auto flex-shrink-0 flex flex-col gap-1 border-l border-[var(--line)] pl-4">
          <span className="panel-title">RISK INTENSITY</span>
          {state.riskUpdates.slice(0, 4).map(r => (
            <div key={r.entity} className="flex items-center gap-2 text-[10px]">
              <span className="text-[var(--text-mid)] w-20 truncate">{r.entity}</span>
              <span className="font-mono font-semibold" style={{ color: r.risk >= 0.7 ? 'var(--critical)' : 'var(--warning)' }}>
                {Math.round(r.risk * 100)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useMemo } from 'react'
import type { SimulationBranch } from '../types'

interface ProbabilityTreeProps {
  branches: SimulationBranch[]
}

export default function ProbabilityTree({ branches }: ProbabilityTreeProps) {
  const activeBranches = useMemo(() => branches.filter(b => b.is_active), [branches])

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Scenario Tree</h3>
      <div className="space-y-3">
        {activeBranches.length === 0 && (
          <p className="text-gray-500 text-sm">No active assumptions to branch on.</p>
        )}
        {activeBranches.map((branch) => (
          <div key={branch.id} className="border border-gray-700 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white flex-1">{branch.description}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                branch.probability > 0.6 ? 'bg-green-900 text-green-300' :
                branch.probability > 0.3 ? 'bg-yellow-900 text-yellow-300' :
                'bg-red-900 text-red-300'
              }`}>
                {(branch.probability * 100).toFixed(0)}%
              </span>
            </div>

            <div className="ml-4 space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-px h-4 bg-gray-600" />
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-green-400">
                    Optimistic ({branch.alternatives[0]?.label}): {(branch.alternatives[0]?.probability * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-px h-4 bg-gray-600" />
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-xs text-red-400">
                    Pessimistic ({branch.alternatives[1]?.label}): {(branch.alternatives[1]?.probability * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            {branch.dependents && (
              <div className="mt-2 text-xs text-gray-500">
                Dependents: {branch.dependents.join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

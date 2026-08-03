import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, RefreshCw, Wallet } from 'lucide-react'
import type { Portfolio } from '../types'
import { listPortfolios, createPortfolio, deletePortfolio } from '../api'
import { DEFAULT_ALLOCATION } from '../ScenarioEditor'

interface PortfolioManagerProps {
  selectedId: string | null
  onSelect: (portfolio: Portfolio) => void
}

export default function PortfolioManager({ selectedId, onSelect }: PortfolioManagerProps) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await listPortfolios()
      setPortfolios(items)
      if (!selectedId && items.length > 0) {
        onSelect(items[0])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load portfolios')
    } finally {
      setLoading(false)
    }
  }, [selectedId, onSelect])

  useEffect(() => {
    load()
  }, [load])

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return
    setCreating(true)
    setError(null)
    try {
      const created = await createPortfolio(newName.trim(), { ...DEFAULT_ALLOCATION })
      setPortfolios(prev => [...prev, created])
      onSelect(created)
      setNewName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create portfolio')
    } finally {
      setCreating(false)
    }
  }, [newName, onSelect])

  const handleDelete = useCallback(async (portfolio: Portfolio) => {
    setError(null)
    try {
      await deletePortfolio(portfolio.id)
      setPortfolios(prev => prev.filter(p => p.id !== portfolio.id))
      if (selectedId === portfolio.id) {
        const remaining = portfolios.filter(p => p.id !== portfolio.id)
        onSelect(remaining[0] ?? ({} as Portfolio))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete portfolio')
    }
  }, [selectedId, portfolios, onSelect])

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-blue-500" />
          Portfolios
        </h3>
        <button
          onClick={load}
          disabled={loading}
          className="text-gray-400 hover:text-white"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

      <div className="space-y-1 max-h-40 overflow-y-auto mb-3">
        {portfolios.map(p => (
          <div
            key={p.id}
            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              selectedId === p.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
            onClick={() => onSelect(p)}
          >
            <span className="text-sm">{p.name}</span>
            <button
              onClick={e => { e.stopPropagation(); handleDelete(p) }}
              className="text-gray-500 hover:text-red-400"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {portfolios.length === 0 && !loading && (
          <p className="text-xs text-gray-600 py-2 text-center">No portfolios yet</p>
        )}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
          placeholder="New portfolio name"
        />
        <button
          onClick={handleCreate}
          disabled={creating || !newName.trim()}
          className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

import { useState, useCallback } from 'react'
import { Play, Plus, X, AlertTriangle, RotateCcw } from 'lucide-react'
import type { Scenario, InjectedEvent, Assumption } from '../types'

interface ScenarioEditorProps {
  onRun: (scenario: Scenario) => void
  initialText?: string
}

export const DEFAULT_ALLOCATION: Record<string, number> = {
  technology: 0.2,
  financials: 0.15,
  healthcare: 0.15,
  consumer_cyclical: 0.1,
  energy: 0.08,
  defense: 0.05,
  utilities: 0.05,
  materials: 0.05,
  bonds: 0.1,
  cash: 0.07,
}

const ALLOCATION_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#A3E635', '#E879F9']

function roundAllocation(alloc: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(alloc).map(([k, v]) => [k, Math.max(0, Math.min(1, Math.round(v * 100) / 100))])
  )
}

export default function ScenarioEditor({ onRun, initialText }: ScenarioEditorProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState(initialText || '')
  const [events, setEvents] = useState<InjectedEvent[]>([])
  const [assumptions, setAssumptions] = useState<Assumption[]>([])
  const [durationDays, setDurationDays] = useState(365)
  const [uncertainty, setUncertainty] = useState(0.3)
  const [allocation, setAllocation] = useState<Record<string, number>>({ ...DEFAULT_ALLOCATION })
  const [newEvent, setNewEvent] = useState({ title: '', type: 'default', severity: 0.5, countries: '' })
  const [newAssumption, setNewAssumption] = useState({ description: '', probability: 0.5, category: 'general' })

  const setSector = useCallback((sector: string, value: number) => {
    setAllocation(prev => roundAllocation({ ...prev, [sector]: value }))
  }, [])

  const resetAllocation = useCallback(() => {
    setAllocation({ ...DEFAULT_ALLOCATION })
  }, [])

  const addEvent = useCallback(() => {
    if (!newEvent.title) return
    setEvents(prev => [...prev, {
      event_type: newEvent.type,
      title: newEvent.title,
      description: newEvent.title,
      countries: newEvent.countries.split(',').map(c => c.trim()).filter(Boolean),
      severity: newEvent.severity,
    }])
    setNewEvent({ title: '', type: 'default', severity: 0.5, countries: '' })
  }, [newEvent])

  const removeEvent = useCallback((index: number) => {
    setEvents(prev => prev.filter((_, i) => i !== index))
  }, [])

  const addAssumption = useCallback(() => {
    if (!newAssumption.description) return
    setAssumptions(prev => [...prev, {
      id: `a_${Date.now()}`,
      description: newAssumption.description,
      probability: newAssumption.probability,
      category: newAssumption.category,
      depends_on: [],
      is_active: true,
    }])
    setNewAssumption({ description: '', probability: 0.5, category: 'general' })
  }, [newAssumption])

  const removeAssumption = useCallback((index: number) => {
    setAssumptions(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleRun = useCallback(() => {
    const scenario: Scenario = {
      id: `scenario_${Date.now()}`,
      title: title || 'Untitled Scenario',
      description,
      assumptions: { assumptions: Object.fromEntries(assumptions.map(a => [a.id, a])) },
      injected_events: events,
      start_time: new Date().toISOString(),
      duration_days: durationDays,
      expected_uncertainty: uncertainty,
      created_at: new Date().toISOString(),
      tags: [],
    }
    onRun(scenario)
  }, [title, description, events, assumptions, durationDays, uncertainty, onRun])

  const totalAllocation = Object.values(allocation).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Scenario Builder</h2>
        <button
          onClick={handleRun}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Play className="w-4 h-4" />
          Run Simulation
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Title</label>
          <input
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g., China invades Taiwan in Q2 2027"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Description</label>
          <textarea
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white min-h-[100px]"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the hypothetical scenario in detail..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Duration (days)</label>
            <input
              type="number"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              value={durationDays}
              onChange={e => setDurationDays(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Expected Uncertainty</label>
            <input
              type="number"
              step={0.1}
              min={0}
              max={1}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              value={uncertainty}
              onChange={e => setUncertainty(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300">Portfolio Allocation</h3>
            <div className="flex items-center gap-3">
              <span className={`text-xs ${Math.abs(totalAllocation - 1) < 0.01 ? 'text-green-400' : 'text-yellow-400'}`}>
                Total: {(totalAllocation * 100).toFixed(0)}%
              </span>
              <button
                onClick={resetAllocation}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {Object.entries(allocation).map(([sector, value], idx) => (
              <div key={sector}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-400 capitalize">{sector.replace(/_/g, ' ')}</span>
                  <span className="text-gray-500">{(value * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={0.6}
                    step={0.01}
                    value={value}
                    onChange={e => setSector(sector, Number(e.target.value))}
                    className="flex-1 accent-blue-500"
                  />
                  <span className="w-5 h-2 rounded" style={{ backgroundColor: ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Injected Events
          </h3>
          <div className="space-y-2 mb-3">
            {events.map((e, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg">
                <span className="text-xs px-2 py-0.5 rounded bg-blue-900 text-blue-300">{e.event_type}</span>
                <span className="text-white text-sm flex-1">{e.title}</span>
                <span className="text-gray-400 text-xs">{e.countries.join(', ') || 'No countries'}</span>
                <span className="text-gray-400 text-xs">sev: {e.severity}</span>
                <button onClick={() => removeEvent(i)} className="text-gray-500 hover:text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
              value={newEvent.title}
              onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
              placeholder="Event title"
            />
            <select
              className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
              value={newEvent.type}
              onChange={e => setNewEvent(p => ({ ...p, type: e.target.value }))}
            >
              <option value="default">Default</option>
              <option value="military_conflict">Military Conflict</option>
              <option value="sanctions">Sanctions</option>
              <option value="trade_war">Trade War</option>
              <option value="chip_export_ban">Chip Export Ban</option>
              <option value="energy_embargo">Energy Embargo</option>
              <option value="cyber_attack">Cyber Attack</option>
            </select>
            <input
              type="number"
              step={0.1}
              min={0}
              max={1}
              className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
              value={newEvent.severity}
              onChange={e => setNewEvent(p => ({ ...p, severity: Number(e.target.value) }))}
            />
            <button onClick={addEvent} className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Assumptions</h3>
          <div className="space-y-2 mb-3">
            {assumptions.map((a, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg">
                <span className={`text-xs px-2 py-0.5 rounded ${a.is_active ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                  {a.probability * 100}%
                </span>
                <span className="text-white text-sm flex-1">{a.description}</span>
                <span className="text-gray-400 text-xs">{a.category}</span>
                <button onClick={() => removeAssumption(i)} className="text-gray-500 hover:text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
              value={newAssumption.description}
              onChange={e => setNewAssumption(p => ({ ...p, description: e.target.value }))}
              placeholder="e.g., US intervenes (70%)"
            />
            <input
              type="number"
              step={0.1}
              min={0}
              max={1}
              className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
              value={newAssumption.probability}
              onChange={e => setNewAssumption(p => ({ ...p, probability: Number(e.target.value) }))}
            />
            <button onClick={addAssumption} className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


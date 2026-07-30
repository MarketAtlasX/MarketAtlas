import { useState } from 'react'
import { X } from 'lucide-react'
import type { LiveEventFilterParams } from '../api/liveEventsApi'

interface LiveEventToolbarProps {
  filters: LiveEventFilterParams
  onChange: (filters: LiveEventFilterParams) => void
  onClose: () => void
}

const EVENT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'geopolitical', label: 'Geopolitical' },
  { value: 'economic', label: 'Economic' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'market_moving', label: 'Market Moving' },
  { value: 'regulatory', label: 'Regulatory' },
  { value: 'natural_disaster', label: 'Natural Disaster' },
]

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'breaking', label: 'Breaking' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'developing', label: 'Developing' },
  { value: 'resolved', label: 'Resolved' },
]

const REGIONS = [
  { value: '', label: 'All Regions' },
  { value: 'Middle East', label: 'Middle East' },
  { value: 'Asia-Pacific', label: 'Asia-Pacific' },
  { value: 'Europe', label: 'Europe' },
  { value: 'North America', label: 'North America' },
  { value: 'South America', label: 'South America' },
  { value: 'Africa', label: 'Africa' },
  { value: 'Global', label: 'Global' },
]

const SORT_OPTIONS = [
  { value: 'first_seen_at', label: 'Newest' },
  { value: 'severity', label: 'Severity' },
  { value: 'impact_score', label: 'Impact' },
]

export default function LiveEventToolbar({ filters, onChange, onClose }: LiveEventToolbarProps) {
  const handleChange = (key: string, value: string | number | boolean | undefined) => {
    onChange({ ...filters, [key]: value || undefined, skip: 0 })
  }

  return (
    <div className="border-b border-white/10 bg-gray-900/95 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Filters</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white">
          <X size={12} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select
          value={filters.type || ''}
          onChange={e => handleChange('type', e.target.value)}
          className="text-[10px] bg-gray-800 border border-white/10 rounded px-2 py-1.5 text-gray-300 focus:outline-none focus:border-blue-500/50"
        >
          {EVENT_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <select
          value={filters.status || ''}
          onChange={e => handleChange('status', e.target.value)}
          className="text-[10px] bg-gray-800 border border-white/10 rounded px-2 py-1.5 text-gray-300 focus:outline-none focus:border-blue-500/50"
        >
          {STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <select
          value={filters.region || ''}
          onChange={e => handleChange('region', e.target.value)}
          className="text-[10px] bg-gray-800 border border-white/10 rounded px-2 py-1.5 text-gray-300 focus:outline-none focus:border-blue-500/50"
        >
          {REGIONS.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>

        <select
          value={filters.sortBy || 'first_seen_at'}
          onChange={e => handleChange('sortBy', e.target.value)}
          className="text-[10px] bg-gray-800 border border-white/10 rounded px-2 py-1.5 text-gray-300 focus:outline-none focus:border-blue-500/50"
        >
          {SORT_OPTIONS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Severity Range</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={filters.severityMin ?? 0}
              onChange={e => handleChange('severityMin', parseFloat(e.target.value) || undefined)}
              className="flex-1 h-1 accent-blue-500"
            />
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={filters.severityMax ?? 10}
              onChange={e => handleChange('severityMax', parseFloat(e.target.value) || undefined)}
              className="flex-1 h-1 accent-blue-500"
            />
          </div>
          <div className="flex justify-between text-[9px] text-gray-500 mt-0.5">
            <span>{filters.severityMin ?? 0}</span>
            <span>{filters.severityMax ?? 10}</span>
          </div>
        </div>

        <div>
          <label className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Country Code</label>
          <input
            type="text"
            maxLength={2}
            value={filters.countryCode || ''}
            onChange={e => handleChange('countryCode', e.target.value.toUpperCase())}
            placeholder="US, CN, IR..."
            className="w-full text-[10px] bg-gray-800 border border-white/10 rounded px-2 py-1.5 text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 uppercase"
          />
        </div>
      </div>
    </div>
  )
}

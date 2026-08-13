import { useState } from 'react'
import { Search, Play } from 'lucide-react'
import Badge from '../../../components/ui/Badge'

const ANALOGUES = [
  { title: '2022 Ukraine Invasion', similarity: 82, impact: 'High', tone: 'critical', sectors: 'Energy · Agriculture · Defense' },
  { title: '2020 Supply Shock', similarity: 76, impact: 'Severe', tone: 'warning', sectors: 'Semiconductors · Logistics' },
  { title: '2012 Hormuz Crisis', similarity: 69, impact: 'Moderate', tone: 'warning', sectors: 'Oil · Shipping' },
  { title: '2011 Fukushima', similarity: 54, impact: 'Moderate', tone: 'neutral', sectors: 'Electronics · Energy' },
]

export default function MemoryTab() {
  const [query, setQuery] = useState('Taiwan semiconductor disruption')

  const filtered = ANALOGUES.filter(a =>
    query ? a.title.toLowerCase().includes(query.toLowerCase()) || a.sectors.toLowerCase().includes(query.toLowerCase()) : true,
  )

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center gap-2 max-w-md">
        <Search size={13} className="text-[var(--text-lo)] shrink-0" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search world memory..."
          className="w-full bg-transparent border-b border-[var(--line-strong)] pb-1 text-[11px] text-[var(--text-hi)] focus:border-[var(--accent)] transition-colors"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto flex-1 min-h-0">
        {filtered.map(a => (
          <div
            key={a.title}
            className="stream-in flex-shrink-0 w-52 flex flex-col gap-1.5 rounded border border-[var(--line)] bg-[rgba(11,22,33,0.55)] p-2.5 group"
          >
            <p className="text-[11px] font-medium text-[var(--text-hi)]">{a.title}</p>
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-wider text-[var(--text-lo)]">Similarity</span>
              <span className="font-mono text-[11px] font-bold text-[var(--accent)]">{a.similarity}%</span>
            </div>
            <div className="h-1 w-full rounded-full bg-[rgba(95,125,153,0.15)] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${a.similarity}%`, background: 'var(--accent)', boxShadow: 'var(--glow-accent)' }} />
            </div>
            <div className="flex items-center justify-between mt-1">
              <Badge tone={a.tone as any}>{a.impact}</Badge>
              <span className="text-[8px] font-mono text-[var(--text-lo)]">{a.sectors}</span>
            </div>
          </div>
        ))}
        <button
          className="flex-shrink-0 w-36 rounded border border-dashed border-[var(--line-strong)] text-[var(--text-lo)] hover:text-[var(--accent)] hover:border-[rgba(56,232,255,0.4)] transition-colors flex flex-col items-center justify-center gap-1.5"
        >
          <Play size={16} />
          <span className="text-[9px] tracking-wider">REPLAY EVENT ON GLOBE</span>
        </button>
      </div>
    </div>
  )
}

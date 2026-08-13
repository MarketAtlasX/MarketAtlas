import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Play, Clock, Globe2 } from 'lucide-react'
import Panel from '../../components/ui/Panel'
import Badge from '../../components/ui/Badge'
import ProgressBar from '../../components/ui/ProgressBar'
import StatusDot from '../../components/ui/StatusDot'

interface Analogue {
  id: string
  title: string
  year: string
  similarity: number
  marketImpact: 'Low' | 'Moderate' | 'High' | 'Severe'
  sectors: string[]
  summary: string
  events: string[]
  marketMove: number
}

const ANALOGUES: Analogue[] = [
  {
    id: 'ukraine-2022',
    title: '2022 Ukraine Invasion',
    year: '2022',
    similarity: 82,
    marketImpact: 'High',
    sectors: ['Energy', 'Agriculture', 'Defense'],
    summary: 'Invasion triggered energy shock, grain export halt, and a 30% rally in defense equities while European gas spiked 150%.',
    events: ['Black Sea blockade', 'EU sanctions waves', 'Commodity supercycle'],
    marketMove: -6.4,
  },
  {
    id: 'supply-2020',
    title: '2020 Semiconductor Supply Shock',
    year: '2020',
    similarity: 76,
    marketImpact: 'Severe',
    sectors: ['Semiconductors', 'Logistics', 'Automotive'],
    summary: 'Chip crunch cascaded through autos and electronics; lead times stretched 4x and foundry pricing power surged.',
    events: ['Fab shutdowns', 'Lead time expansion', 'Price hikes'],
    marketMove: -2.1,
  },
  {
    id: 'hormuz-2012',
    title: '2012 Strait of Hormuz Crisis',
    year: '2012',
    similarity: 69,
    marketImpact: 'Moderate',
    sectors: ['Oil', 'Shipping', 'Insurance'],
    summary: 'Blockade threats lifted Brent 15% in weeks; tanker rates and war-risk premiums spiked before de-escalation.',
    events: ['Naval buildup', 'Sanctions tightening', 'Strategic reserve release'],
    marketMove: -3.8,
  },
  {
    id: 'fukushima-2011',
    title: '2011 Fukushima Disaster',
    year: '2011',
    similarity: 54,
    marketImpact: 'Moderate',
    sectors: ['Electronics', 'Energy', 'Autos'],
    summary: 'Supply chain halt in Japan rippled through electronics; energy policy pivoted away from nuclear.',
    events: ['Plant closures', 'Nuclear phase-out', 'Factory downtime'],
    marketMove: -1.9,
  },
  {
    id: 'gulf-1990',
    title: '1990 Gulf War Oil Shock',
    year: '1990',
    similarity: 61,
    marketImpact: 'Severe',
    sectors: ['Energy', 'Defense', 'Airlines'],
    summary: 'Kuwaiti supply loss sent oil to $40+; airliners reeled while defense and energy names rallied hard.',
    events: ['Supply disruption', 'Strategic reserve release', 'Military escalation'],
    marketMove: -4.2,
  },
]

const IMPACT_TONE: Record<string, 'critical' | 'warning' | 'neutral' | 'positive'> = {
  Low: 'positive',
  Moderate: 'neutral',
  High: 'warning',
  Severe: 'critical',
}

export default function MemoryPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('Taiwan semiconductor disruption')
  const [selected, setSelected] = useState<Analogue | null>(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return ANALOGUES
    const q = query.toLowerCase()
    return ANALOGUES.filter(
      a =>
        a.title.toLowerCase().includes(q) ||
        a.sectors.some(s => s.toLowerCase().includes(q)) ||
        a.events.some(e => e.toLowerCase().includes(q)) ||
        a.summary.toLowerCase().includes(q),
    )
  }, [query])

  return (
    <div className="h-full flex flex-col p-4 gap-3 overflow-hidden bg-command">
      <div className="shrink-0 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-wide text-[var(--text-hi)]">WORLD MEMORY</h1>
          <p className="text-[10px] font-mono text-[var(--text-mid)]">SEARCHABLE INTELLIGENCE ARCHIVE · HISTORICAL ANALOGUES</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[var(--line-strong)] bg-[rgba(6,12,18,0.8)] px-3 py-2 w-96 focus-within:border-[rgba(56,232,255,0.5)] transition-colors">
          <Search size={14} className="text-[var(--text-lo)]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search memory..."
            className="flex-1 bg-transparent text-[12px] text-[var(--text-hi)]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3 flex-1 min-h-0">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 overflow-y-auto pr-1 content-start">
          {filtered.map(a => (
            <button
              key={a.id}
              onClick={() => setSelected(a)}
              className={`panel stream-in text-left p-3.5 transition-colors ${
                selected?.id === a.id ? 'border-[rgba(56,232,255,0.45)]' : 'hover:border-[rgba(56,232,255,0.3)]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-semibold text-[var(--text-hi)]">{a.title}</span>
                <span className="font-mono text-[9px] text-[var(--text-lo)]">{a.year}</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] uppercase tracking-wider text-[var(--text-lo)]">Similarity</span>
                <span className="font-mono text-sm font-bold text-[var(--accent)]">{a.similarity}%</span>
                <Badge tone={IMPACT_TONE[a.marketImpact]} className="ml-auto">Market impact · {a.marketImpact}</Badge>
              </div>
              <ProgressBar value={a.similarity} color="var(--accent)" />
              <div className="flex gap-1 mt-2.5 flex-wrap">
                {a.sectors.map(s => (
                  <Badge key={s} tone="neutral">{s}</Badge>
                ))}
              </div>
              <p className="text-[10px] text-[var(--text-mid)] leading-relaxed mt-2 line-clamp-2">{a.summary}</p>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-[var(--text-lo)]">
              <Search size={28} className="mb-2" />
              <p className="text-xs">No analogues match your query.</p>
            </div>
          )}
        </div>

        <div className="min-h-0 overflow-y-auto">
          {selected ? (
            <Panel title="ANALOGUE DETAIL" glow="accent" corners>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-hi)]">{selected.title}</p>
                    <p className="text-[9px] font-mono text-[var(--text-lo)]">{selected.year} · {selected.marketImpact} market impact</p>
                  </div>
                  <StatusDot tone={selected.similarity >= 75 ? 'critical' : 'warning'} />
                </div>

                <div>
                  <p className="text-[9px] uppercase tracking-wider text-[var(--text-mid)] mb-1.5">Event sequence</p>
                  <div className="flex flex-col">
                    {selected.events.map((e, i) => (
                      <div key={e} className="flex items-start gap-2">
                        <div className="flex flex-col items-center">
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] mt-1.5" />
                          {i < selected.events.length - 1 && <span className="w-px flex-1 bg-[var(--line-strong)]" />}
                        </div>
                        <span className="text-[11px] text-[var(--text-mid)] pb-2">{e}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[9px] uppercase tracking-wider text-[var(--text-mid)] mb-1">Observed market effect</p>
                  <p className="font-mono text-lg font-bold" style={{ color: selected.marketMove >= 0 ? 'var(--positive)' : 'var(--critical)' }}>
                    {selected.marketMove >= 0 ? '+' : ''}
                    {selected.marketMove.toFixed(1)}% <span className="text-[9px] font-normal text-[var(--text-lo)]">30-DAY EQUITY RESPONSE</span>
                  </p>
                </div>

                <p className="text-[11px] text-[var(--text-mid)] leading-relaxed">{selected.summary}</p>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="flex-1 flex items-center justify-center gap-2 rounded border border-[rgba(56,232,255,0.35)] bg-[rgba(56,232,255,0.1)] py-2 text-[10px] font-semibold tracking-[0.15em] text-[var(--accent)] hover:bg-[rgba(56,232,255,0.18)] transition-colors"
                  >
                    <Globe2 size={13} /> REPLAY ON GLOBE
                  </button>
                  <button
                    onClick={() => navigate('/simulator')}
                    className="flex-1 flex items-center justify-center gap-2 rounded border border-[var(--line)] py-2 text-[10px] font-semibold tracking-[0.15em] text-[var(--text-mid)] hover:text-[var(--text-hi)] hover:border-[var(--line-strong)] transition-colors"
                  >
                    <Play size={12} /> SIMULATE
                  </button>
                </div>
              </div>
            </Panel>
          ) : (
            <Panel title="INSPECT AN ANALOGUE">
              <div className="flex flex-col items-center justify-center py-16 text-[var(--text-lo)]">
                <Clock size={26} className="mb-2" />
                <p className="text-xs text-center max-w-[200px]">Select a historical analogue to inspect its event sequence and market response.</p>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}

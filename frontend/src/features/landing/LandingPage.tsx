import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Clock,
  Cpu,
  Database,
  Globe2,
  Layers,
  Link2,
  MapPin,
  MessageSquareText,
  Radio,
  Satellite,
  Server,
  ShieldCheck,
  TrendingUp,
  Waves,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const CAPABILITIES = [
  {
    icon: Satellite,
    title: 'Live event ingestion',
    body: 'A GDELT DOC 2.0 poller validates, deduplicates, and broadcasts new geopolitical events straight to your browser over one WebSocket.',
  },
  {
    icon: Globe2,
    title: 'Cinematic globe',
    body: 'Every located event lands on a WebGL globe. Select it and the camera flies you to where the world just changed.',
  },
  {
    icon: ShieldCheck,
    title: 'One evidence contract',
    body: 'A single EvidenceObservation envelope composes the event, its sources, impacts, affected assets, and market quotes. Everything downstream renders exactly that.',
  },
  {
    icon: Link2,
    title: 'Causal intelligence, bounded',
    body: 'The UI shows only the causal hops the backend actually recorded — with confidence and evidence references — and says so where the chain ends.',
  },
  {
    icon: TrendingUp,
    title: 'Markets with provenance',
    body: 'Affected assets surface with value, freshness, and a provider-backed status. Missing data renders UNAVAILABLE — never a synthetic number.',
  },
  {
    icon: MessageSquareText,
    title: 'ATLAS, evidence-grounded',
    body: 'The assistant answers strictly from the evidence on screen, cites its provenance, and separates recorded fact from unsupported inference.',
  },
]

const JOURNEY = [
  { step: '01', title: 'Live Event', body: 'A validated world event arrives from the live feed.' },
  { step: '02', title: 'Globe', body: 'The camera flies to the recorded coordinates.' },
  { step: '03', title: 'Evidence', body: 'One canonical observation loads for the selection.' },
  { step: '04', title: 'Causal Chain', body: 'Only the hops the backend actually recorded.' },
  { step: '05', title: 'Markets', body: 'Affected assets with value, freshness and provider.' },
  { step: '06', title: 'ATLAS', body: 'Ask the assistant, grounded in the evidence on screen.' },
]

const STACK = [
  { icon: Server, label: 'FastAPI + PostgreSQL + Redis' },
  { icon: Radio, label: 'WebSocket event stream' },
  { icon: Cpu, label: 'LLM-grounded assistant' },
  { icon: Database, label: 'Provider-backed market data' },
  { icon: Layers, label: 'React 19 + WebGL frontend' },
]

const METRICS = [
  { value: '1', label: 'canonical evidence contract' },
  { value: '0', label: 'fabricated values, ever' },
  { value: '120s', label: 'live ingest interval' },
  { value: '6', label: 'stages from event to answer' },
]

const CONSOLE_STAGES = [
  { label: 'EVENT', value: 'Strait transit disruption', status: 'LIVE', tone: 'live' },
  { label: 'IMPACT', value: 'Energy · Shipping', status: 'RECORDED', tone: 'ok' },
  { label: 'ASSET', value: 'XOM · CVX', status: 'PROVIDER-BACKED', tone: 'ok' },
  { label: 'MARKET OBS.', value: 'Quote unavailable', status: 'UNAVAILABLE', tone: 'warn' },
]

const TONE_STYLES: Record<string, string> = {
  live: 'border-[rgba(46,230,168,0.35)] text-[var(--positive)]',
  ok: 'border-[rgba(56,232,255,0.3)] text-[var(--accent)]',
  warn: 'border-[rgba(245,185,65,0.35)] text-[var(--warning)]',
}

/** Live backend reachability — proves the stack is actually running. */
function useSystemStatus() {
  const [online, setOnline] = useState<boolean | null>(null)
  useEffect(() => {
    if (import.meta.env.MODE === 'test') return
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 4000)
    fetch('/api/health', { signal: controller.signal })
      .then(res => setOnline(res.ok))
      .catch(() => setOnline(false))
      .finally(() => window.clearTimeout(timer))
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [])
  return online
}

export default function LandingPage() {
  const { user, status } = useAuth()
  const signedIn = status === 'authenticated' && user !== null
  const online = useSystemStatus()

  const statusLabel =
    online === null ? 'CHECKING' : online ? 'SYSTEM ONLINE' : 'BACKEND OFFLINE'
  const statusColor =
    online === null ? 'var(--text-lo)' : online ? 'var(--positive)' : 'var(--warning)'

  return (
    <div
      className="min-h-screen w-full bg-command overflow-y-auto"
      style={{ scrollBehavior: 'smooth' }}
    >
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[rgba(11,13,15,0.85)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 bg-[var(--accent)] pulse-dot" />
            <span className="text-[13px] font-semibold tracking-[0.22em] text-[var(--text-hi)]">
              MARKET<span className="text-[var(--accent)] text-glow">ATLAS</span>
            </span>
            <span
              className="hidden items-center gap-1.5 rounded border border-[var(--line)] px-2 py-1 text-[9px] font-mono uppercase tracking-[0.16em] lg:inline-flex"
              style={{ color: statusColor }}
              title="Live backend reachability"
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusColor }} />
              {statusLabel}
            </span>
          </div>

          <nav className="flex items-center gap-3">
            <a
              href="#capabilities"
              className="hidden text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--text-mid)] transition-colors hover:text-[var(--accent)] sm:inline"
            >
              Capabilities
            </a>
            <a
              href="#pipeline"
              className="hidden text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--text-mid)] transition-colors hover:text-[var(--accent)] sm:inline"
            >
              Pipeline
            </a>
            <a
              href="#stack"
              className="hidden text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--text-mid)] transition-colors hover:text-[var(--accent)] md:inline"
            >
              Stack
            </a>
            {signedIn ? (
              <Link
                to="/dashboard"
                className="rounded border border-[rgba(56,232,255,0.45)] bg-[rgba(56,232,255,0.08)] px-3.5 py-1.5 text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--accent)] transition-colors hover:bg-[rgba(56,232,255,0.14)]"
              >
                Open workspace
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--text-mid)] transition-colors hover:text-[var(--accent)]"
                >
                  Sign in
                </Link>
                <Link

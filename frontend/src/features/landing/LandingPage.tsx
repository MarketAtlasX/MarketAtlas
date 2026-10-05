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
                  to="/register"
                  className="rounded border border-[rgba(56,232,255,0.45)] bg-[rgba(56,232,255,0.08)] px-3.5 py-1.5 text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--accent)] transition-colors hover:bg-[rgba(56,232,255,0.14)]"
                >
                  Create account
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-6xl px-6 pt-16 pb-12">
        <div
          className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-72 max-w-3xl"
          style={{ background: 'radial-gradient(ellipse at center, rgba(56,232,255,0.09), transparent 65%)' }}
        />
        <div className="relative grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Copy */}
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded border border-[var(--line)] bg-[rgba(6,12,18,0.72)] px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--accent)]">
              <Waves size={12} />
              Geopolitical intelligence · evidence-first
            </p>
            <h1 className="font-display text-4xl font-semibold leading-tight text-[var(--text-hi)] sm:text-5xl">
              Connect world events to the markets they move —{' '}
              <span className="text-[var(--accent)] text-glow">without inventing a single number.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-[var(--text-mid)]">
              MarketAtlas ingests live geopolitical events, places them on a cinematic globe, composes
              one canonical evidence record per event, and lets an evidence-grounded assistant answer
              questions strictly from what the backend actually recorded. If the evidence does not
              establish it, the interface says so.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {signedIn ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 rounded border border-[rgba(56,232,255,0.55)] bg-[rgba(56,232,255,0.12)] px-5 py-2.5 text-[12px] font-mono uppercase tracking-[0.18em] text-[var(--accent)] transition-all hover:bg-[rgba(56,232,255,0.2)] hover:shadow-[0_0_18px_rgba(56,232,255,0.25)]"
                >
                  Welcome back, {user.display_name.split(' ')[0]} — open workspace
                  <ArrowRight size={14} />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 rounded border border-[rgba(56,232,255,0.55)] bg-[rgba(56,232,255,0.12)] px-5 py-2.5 text-[12px] font-mono uppercase tracking-[0.18em] text-[var(--accent)] transition-all hover:bg-[rgba(56,232,255,0.2)] hover:shadow-[0_0_18px_rgba(56,232,255,0.25)]"
                  >
                    Get started — create account
                    <ArrowRight size={14} />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 rounded border border-[var(--line)] bg-[rgba(6,12,18,0.72)] px-5 py-2.5 text-[12px] font-mono uppercase tracking-[0.18em] text-[var(--text-mid)] transition-colors hover:border-[rgba(56,232,255,0.35)] hover:text-[var(--accent)]"
                  >
                    Sign in
                  </Link>
                  <a
                    href="#pipeline"
                    className="inline-flex items-center gap-1.5 px-2 py-2.5 text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--text-lo)] transition-colors hover:text-[var(--accent)]"
                  >
                    See how it works
                    <ArrowRight size={12} />
                  </a>
                </>
              )}
            </div>

            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2">
              {['No fabrication', 'Provider-backed quotes', 'Single evidence contract'].map(item => (
                <span key={item} className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-lo)]">
                  <BadgeCheck size={13} className="text-[var(--positive)]" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Evidence console mock */}
          <div className="relative">
            <div
              className="pointer-events-none absolute -inset-6 rounded-full opacity-40"
              style={{ background: 'radial-gradient(circle at 70% 30%, rgba(56,232,255,0.12), transparent 60%)' }}
            />
            <div className="panel hud-corners relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
                <span className="panel-title">Evidence observation</span>
                <span className="inline-flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--positive)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--positive)] pulse-dot" />
                  streaming
                </span>
              </div>

              <div className="space-y-3 px-4 py-4">
                <div className="flex items-start gap-2.5">
                  <Activity size={13} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                  <div>
                    <p className="text-[12.5px] font-medium leading-snug text-[var(--text-hi)]">
                      Strait transit disruption halts tanker traffic
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--text-lo)]">
                      <MapPin size={10} /> backend-provided coordinates
                      <Clock size={10} className="ml-1.5" /> live
                    </p>
                  </div>
                </div>

                <div className="divider" />

                <div className="space-y-2">
                  {CONSOLE_STAGES.map(stage => (
                    <div key={stage.label} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--neutral)]">
                          {stage.label}
                        </p>
                        <p className="truncate text-[12px] text-[var(--text-mid)]">{stage.value}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded border px-2 py-0.5 text-[8.5px] font-mono uppercase tracking-[0.14em] ${TONE_STYLES[stage.tone]}`}
                      >
                        {stage.status}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="divider" />

                <p className="text-[10.5px] leading-relaxed text-[var(--text-lo)]">
                  EVENT → IMPACT → ASSET → MARKET OBSERVATION. Hops the backend did not record are
                  reported as <span className="font-mono text-[var(--warning)]">NOT ESTABLISHED</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Metrics band ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-6">
        <div className="panel scanline grid grid-cols-2 gap-px overflow-hidden bg-[var(--line)] sm:grid-cols-4">
          {METRICS.map(metric => (
            <div key={metric.label} className="bg-[rgba(21,25,28,0.96)] px-5 py-4">
              <p className="font-display text-2xl font-semibold text-[var(--accent)]">{metric.value}</p>
              <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--text-lo)]">
                {metric.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Core journey ────────────────────────────────────────────────── */}
      <section id="pipeline" className="mx-auto max-w-6xl px-6 py-12">
        <p className="panel-title mb-2">The core journey</p>
        <h2 className="mb-6 font-display text-2xl font-semibold text-[var(--text-hi)]">
          From a live event to a grounded answer
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {JOURNEY.map(item => (
            <div
              key={item.step}
              className="panel hud-corners p-5 transition-colors hover:border-[rgba(56,232,255,0.28)]"
            >
              <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--accent)]">
                {item.step}
              </span>
              <h3 className="mt-2 text-[14px] font-semibold text-[var(--text-hi)]">{item.title}</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--text-mid)]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Capabilities ────────────────────────────────────────────────── */}
      <section id="capabilities" className="mx-auto max-w-6xl px-6 py-12">
        <p className="panel-title mb-6">What it does</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="panel hud-corners group p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(56,232,255,0.3)]"
            >
              <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded border border-[var(--line)] bg-[rgba(56,232,255,0.06)] transition-colors group-hover:border-[rgba(56,232,255,0.35)]">
                <Icon size={16} className="text-[var(--accent)]" />
              </span>
              <h3 className="mb-2 text-[14px] font-semibold text-[var(--text-hi)]">{title}</h3>
              <p className="text-[12.5px] leading-relaxed text-[var(--text-mid)]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── No fabrication ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="panel scanline flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <BadgeCheck size={22} className="shrink-0 text-[var(--positive)]" />
          <div className="flex-1">
            <h3 className="text-[15px] font-semibold text-[var(--text-hi)]">
              The no-fabrication guarantee
            </h3>
            <p className="mt-1.5 max-w-3xl text-[12.5px] leading-relaxed text-[var(--text-mid)]">
              Missing data renders as <span className="font-mono text-[var(--warning)]">UNAVAILABLE</span> — never a
              plausible-looking placeholder. Unlocated events are not placed on the globe. Unsupported assistant
              claims are labelled &ldquo;the evidence does not establish it&rdquo;. Simulated data is tagged{' '}
              <span className="font-mono text-[var(--warning)]">SIMULATED</span> at the record level, never passed off
              as live.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
            <span className="rounded border border-[rgba(46,230,168,0.35)] px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--positive)]">
              Live
            </span>
            <span className="rounded border border-[rgba(245,185,65,0.35)] px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--warning)]">
              Unavailable
            </span>
            <span className="rounded border border-[var(--line)] px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--text-lo)]">
              Not provided
            </span>
          </div>
        </div>
      </section>

      {/* ── Stack ───────────────────────────────────────────────────────── */}
      <section id="stack" className="mx-auto max-w-6xl px-6 py-12">
        <p className="panel-title mb-6">Built on</p>
        <div className="flex flex-wrap gap-3">
          {STACK.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-2 rounded border border-[var(--line)] bg-[rgba(21,25,28,0.96)] px-3.5 py-2 text-[11px] font-mono tracking-[0.1em] text-[var(--text-mid)] transition-colors hover:border-[rgba(56,232,255,0.3)] hover:text-[var(--accent)]"
            >
              <Icon size={13} className="text-[var(--accent)]" />
              {label}
            </span>
          ))}
        </div>

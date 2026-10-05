import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Cpu,
  Database,
  Globe2,
  Layers,
  Link2,
  MessageSquareText,
  Radio,
  ShieldCheck,
  Satellite,
  Server,
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
    icon: Activity,
    title: 'Markets with provenance',
    body: 'Affected assets surface with value, freshness, and a provider-backed status. Missing data renders UNAVAILABLE — never a synthetic number.',
  },
  {
    icon: MessageSquareText,
    title: 'ATLAS, evidence-grounded',
    body: 'The assistant answers strictly from the evidence on screen, cites its provenance, and separates recorded fact from unsupported inference.',
  },
]

const JOURNEY = ['Live Event', 'Globe', 'Evidence', 'Causal Chain', 'Markets', 'ATLAS']

const STACK = [
  { icon: Server, label: 'FastAPI + PostgreSQL + Redis' },
  { icon: Radio, label: 'WebSocket event stream' },
  { icon: Cpu, label: 'LLM-grounded assistant' },
  { icon: Database, label: 'Provider-backed market data' },
  { icon: Layers, label: 'React 19 + WebGL frontend' },
]

export default function LandingPage() {
  const { user, status } = useAuth()
  const signedIn = status === 'authenticated' && user !== null

  return (
    <div className="min-h-screen w-full bg-command overflow-y-auto">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[rgba(11,13,15,0.85)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 bg-[var(--accent)] pulse-dot" />
            <span className="text-[13px] font-semibold tracking-[0.22em] text-[var(--text-hi)]">
              MARKET<span className="text-[var(--accent)] text-glow">ATLAS</span>
            </span>
          </div>
          <nav className="flex items-center gap-3">
            <a
              href="#capabilities"
              className="hidden sm:inline text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--text-mid)] transition-colors hover:text-[var(--accent)]"
            >
              Capabilities
            </a>
            <a
              href="#pipeline"
              className="hidden sm:inline text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--text-mid)] transition-colors hover:text-[var(--accent)]"
            >
              Pipeline
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
      <section className="relative mx-auto max-w-6xl px-6 pt-20 pb-16">
        <div
          className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-64 max-w-3xl"
          style={{ background: 'radial-gradient(ellipse at center, rgba(56,232,255,0.07), transparent 65%)' }}
        />
        <p className="mb-4 inline-flex items-center gap-2 rounded border border-[var(--line)] bg-[rgba(6,12,18,0.72)] px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--accent)]">
          <Waves size={12} />
          Geopolitical intelligence · evidence-first
        </p>
        <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight text-[var(--text-hi)] sm:text-5xl">
          Connect world events to the markets they move —{' '}
          <span className="text-[var(--accent)] text-glow">without inventing a single number.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[var(--text-mid)]">
          MarketAtlas ingests live geopolitical events, places them on a cinematic globe, composes one canonical
          evidence record per event, and lets an evidence-grounded assistant answer questions strictly from what the
          backend actually recorded. If the evidence does not establish it, the interface says so.
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
            </>
          )}
        </div>
      </section>

      {/* ── Core journey ────────────────────────────────────────────────── */}
      <section id="pipeline" className="mx-auto max-w-6xl px-6 py-12">
        <p className="panel-title mb-4">The core journey</p>
        <div className="flex flex-wrap items-center gap-2">
          {JOURNEY.map((step, index) => (
            <div key={step} className="flex items-center gap-2">
              <span className="rounded border border-[var(--line)] bg-[rgba(21,25,28,0.96)] px-3 py-1.5 text-[11px] font-mono tracking-[0.12em] text-[var(--text-mid)]">
                {step}
              </span>
              {index < JOURNEY.length - 1 && (
                <ArrowRight size={12} className="text-[var(--text-lo)]" />
              )}
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
              className="panel hud-corners p-5 transition-colors hover:border-[rgba(56,232,255,0.28)]"
            >
              <Icon size={18} className="mb-3 text-[var(--accent)]" />
              <h3 className="mb-2 text-[14px] font-semibold text-[var(--text-hi)]">{title}</h3>
              <p className="text-[12.5px] leading-relaxed text-[var(--text-mid)]">{body}</p>
            </div>
          ))}
        </div>
      </section>

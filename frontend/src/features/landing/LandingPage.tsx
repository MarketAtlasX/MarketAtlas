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

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

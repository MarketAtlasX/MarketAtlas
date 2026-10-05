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

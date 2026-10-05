import { useCallback, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, AtSign, KeyRound, Loader2, ShieldCheck, User } from 'lucide-react'
import { authErrorMessage, useAuth } from '../../context/AuthContext'
import CaptchaChallenge from './CaptchaChallenge'

type Mode = 'login' | 'register'

interface AuthPageProps {
  mode: Mode
}

/**
 * Unified sign-in / sign-up page. Both modes require a server-issued captcha;
 * a failed attempt consumes the challenge, so the component bumps a refresh
 * counter to fetch a fresh one while keeping the typed fields intact.
 */
export default function AuthPage({ mode }: AuthPageProps) {
  const isRegister = mode === 'register'
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [captchaId, setCaptchaId] = useState('')
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [captchaRefresh, setCaptchaRefresh] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChallenge = useCallback((id: string) => setCaptchaId(id), [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submitting) return
    if (!captchaId || !captchaAnswer.trim()) {
      setError('Complete the security check before continuing.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      if (isRegister) {
        await register({ email, password, displayName, captchaId, captchaAnswer })
      } else {
        await login({ email, password, captchaId, captchaAnswer })
      }
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(authErrorMessage(err))
      // The captcha was consumed by the failed attempt (win or lose) — fetch a
      // fresh challenge and clear the answer field.
      setCaptchaAnswer('')
      setCaptchaRefresh(n => n + 1)
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full rounded border border-[var(--line)] bg-[rgba(6,12,18,0.72)] py-2.5 pl-9 pr-3 text-[13px] text-[var(--text-hi)] transition-colors placeholder:text-[var(--text-lo)] focus:border-[rgba(56,232,255,0.45)]'

  return (
    <div className="min-h-screen w-full bg-command flex items-center justify-center px-4 py-10 overflow-y-auto">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Back to home">
            <span className="h-2.5 w-2.5 bg-[var(--accent)] pulse-dot" />
            <span className="text-[15px] font-semibold tracking-[0.22em] text-[var(--text-hi)]">
              MARKET<span className="text-[var(--accent)] text-glow">ATLAS</span>
            </span>
          </Link>
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-[var(--text-lo)]">
            {isRegister ? 'Create your account' : 'Operator sign-in'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="panel hud-corners p-6 sm:p-7">
          <h1 className="font-display text-xl font-semibold text-[var(--text-hi)]">
            {isRegister ? 'Join MarketAtlas' : 'Welcome back'}
          </h1>
          <p className="mt-1.5 mb-6 text-[12px] text-[var(--text-mid)]">
            {isRegister
              ? 'Live events, evidence, causal chains, and ATLAS — one account.'
              : 'Sign in to reopen the command center.'}
          </p>

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

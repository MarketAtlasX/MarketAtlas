import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { isAxiosError } from 'axios'
import { api } from '../api/client'
import { clearToken, getToken, setToken, type AuthUser } from '../auth/storage'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface LoginInput {
  email: string
  password: string
  captchaId: string
  captchaAnswer: string
}

export interface RegisterInput extends LoginInput {
  displayName: string
}

interface AuthContextValue {
  user: AuthUser | null
  status: AuthStatus
  login: (input: LoginInput) => Promise<AuthUser>
  register: (input: RegisterInput) => Promise<AuthUser>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface TokenResponsePayload {
  access_token: string
  user: AuthUser
}

/**
 * Extract the backend's `detail` message (FastAPI convention) into something
 * the auth page can show verbatim. Network failures get a distinct message so
 * "wrong password" never looks like "backend offline".
 */
export function authErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response) {
      const detail = error.response.data?.detail
      if (typeof detail === 'string' && detail.trim()) return detail
      if (Array.isArray(detail)) {
        const first = detail[0]?.msg
        if (typeof first === 'string') return first
      }
      return error.response.status === 401
        ? 'Invalid email or password.'
        : 'Authentication failed. Please try again.'
    }
    return 'Cannot reach the MarketAtlas backend. Is it running?'
  }
  return 'Authentication failed. Please try again.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  // Resume an existing session: a stored JWT is only trusted once the backend
  // accepts it at /auth/me — a stale/revoked token is dropped immediately.
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setStatus('unauthenticated')
      return
    }
    let cancelled = false
    api
      .get<AuthUser>('/auth/me', { timeout: 8000 })
      .then(response => {
        if (cancelled) return
        setUser(response.data)
        setStatus('authenticated')
      })
      .catch(() => {
        if (cancelled) return
        clearToken()
        setStatus('unauthenticated')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const applySession = useCallback((payload: TokenResponsePayload) => {
    setToken(payload.access_token)
    setUser(payload.user)
    setStatus('authenticated')
    return payload.user
  }, [])

  const login = useCallback(
    async (input: LoginInput) => {
      const { data } = await api.post<TokenResponsePayload>('/auth/login', {
        email: input.email.trim(),
        password: input.password,
        captcha_id: input.captchaId,
        captcha_answer: input.captchaAnswer,
      })
      return applySession(data)
    },
    [applySession],
  )

  const register = useCallback(
    async (input: RegisterInput) => {
      const { data } = await api.post<TokenResponsePayload>('/auth/register', {
        email: input.email.trim(),
        password: input.password,
        display_name: input.displayName.trim(),
        captcha_id: input.captchaId,
        captcha_answer: input.captchaAnswer,
      })
      return applySession(data)
    },
    [applySession],
  )

  const logout = useCallback(() => {
    // Best-effort authenticated 200; the JWT stays valid server-side until it
    // expires, so the real session end is dropping the token here.
    api.post('/auth/logout', null, { timeout: 3000 }).catch(() => {})
    clearToken()
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

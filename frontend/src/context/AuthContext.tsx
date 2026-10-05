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

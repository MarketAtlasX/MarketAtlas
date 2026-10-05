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

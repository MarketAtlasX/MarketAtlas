import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '../context/AuthContext'
import LandingPage from '../features/landing/LandingPage'
import AuthPage from '../features/auth/AuthPage'

const { post, get, noopInterceptor } = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  noopInterceptor: { use: () => {} },
}))
vi.mock('axios', () => {
  const isAxiosError = (e: unknown): boolean => typeof e === 'object' && e !== null && 'response' in e
  return {
    default: {
      create: () => ({
        post,
        get,
        interceptors: { request: noopInterceptor, response: noopInterceptor },
      }),
      isAxiosError,
    },
    isAxiosError,
  }
})

const tokenPayload = {
  access_token: 'jwt-token',
  user: { id: 1, email: 'a@b.co', display_name: 'Atlas', is_active: true, created_at: '2026-01-01T00:00:00Z' },
}

// Exposes the auth actions so tests can simulate an already-signed-in visitor.
function SignedInProbe() {
  const { login } = useAuth()
  return (
    <button onClick={() => void login({ email: 'a@b.co', password: 'pw123456', captchaId: 'c1', captchaAnswer: 'x7' })}>
      sign-in
    </button>
  )
}

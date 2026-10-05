import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { AuthProvider, authErrorMessage, useAuth } from '../context/AuthContext'

const { post, get, noopInterceptor } = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  noopInterceptor: { use: () => {} },
}))
vi.mock('axios', () => {
  const isAxiosError = (e: unknown): e is { response?: { status: number; data: { detail?: string } } } =>
    typeof e === 'object' && e !== null && 'response' in e
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

function Probe() {
  const { user, status, login, register, logout } = useAuth()
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="user">{user ? user.display_name : 'none'}</span>
      <button onClick={() => void login({ email: 'a@b.co', password: 'pw123456', captchaId: 'c1', captchaAnswer: 'x7' })}>
        login
      </button>
      <button
        onClick={() =>
          void register({ email: 'a@b.co', password: 'pw123456', displayName: 'Atlas', captchaId: 'c1', captchaAnswer: 'x7' })
        }
      >
        register
      </button>
      <button onClick={() => logout()}>logout</button>
    </div>
  )
}

const tokenPayload = {
  access_token: 'jwt-token',
  user: { id: 1, email: 'a@b.co', display_name: 'Atlas', is_active: true, created_at: '2026-01-01T00:00:00Z' },
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    post.mockReset()
    get.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

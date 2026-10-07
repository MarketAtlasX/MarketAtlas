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
          void login({ email: 'a@b.co', password: 'pw123456', captchaId: 'c1', captchaAnswer: 'x7', rememberMe: false })
        }
      >
        login-session
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
    sessionStorage.clear()
    post.mockReset()
    get.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts unauthenticated without a stored token', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'))
  })

  it('restores the session from a stored token via /auth/me', async () => {
    localStorage.setItem('marketatlas_token', 'stored-jwt')
    get.mockResolvedValue({ data: tokenPayload.user })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'))
    expect(screen.getByTestId('user')).toHaveTextContent('Atlas')
    expect(get).toHaveBeenCalledWith('/auth/me', { timeout: 8000 })
  })

  it('drops a stale stored token when /auth/me rejects', async () => {
    localStorage.setItem('marketatlas_token', 'stale-jwt')
    get.mockRejectedValue(new Error('401'))

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'))
    expect(localStorage.getItem('marketatlas_token')).toBeNull()
  })

  it('login stores the token and sets the user', async () => {
    post.mockResolvedValue({ data: tokenPayload })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'))

    await act(async () => {
      screen.getByText('login').click()
    })
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'))
    expect(localStorage.getItem('marketatlas_token')).toBe('jwt-token')
    expect(post).toHaveBeenCalledWith('/auth/login', {
      email: 'a@b.co',
      password: 'pw123456',
      captcha_id: 'c1',
      captcha_answer: 'x7',
    })
  })

  it('register posts display_name and captcha fields', async () => {
    post.mockResolvedValue({ data: tokenPayload })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'))

    await act(async () => {
      screen.getByText('register').click()
    })
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Atlas'))
    expect(post).toHaveBeenCalledWith('/auth/register', {
      email: 'a@b.co',
      password: 'pw123456',
      display_name: 'Atlas',
      captcha_id: 'c1',
      captcha_answer: 'x7',
    })
  })

  it('keeps the token session-only when remember me is off', async () => {
    post.mockResolvedValue({ data: tokenPayload })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'))

    await act(async () => {
      screen.getByText('login-session').click()
    })
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'))
    expect(localStorage.getItem('marketatlas_token')).toBeNull()
    expect(sessionStorage.getItem('marketatlas_token')).toBe('jwt-token')
  })

  it('logout clears the token and user', async () => {
    post.mockResolvedValue({ data: tokenPayload })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await act(async () => {
      screen.getByText('login').click()
    })
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'))

    await act(async () => {
      screen.getByText('logout').click()
    })
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'))
    expect(localStorage.getItem('marketatlas_token')).toBeNull()
  })

  it('extracts the backend detail message from a failed login', () => {
    const message = authErrorMessage({
      response: { status: 400, data: { detail: 'Captcha verification failed — request a new challenge' } },
    })
    expect(message).toBe('Captcha verification failed — request a new challenge')
  })

  it('maps a network failure to an offline message', () => {
    expect(authErrorMessage(new Error('boom'))).not.toContain('password')
  })
})

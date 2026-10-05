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

function renderAt(path: string, ui: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
  )
}

describe('LandingPage', () => {
  beforeEach(() => {
    localStorage.clear()
    post.mockReset()
    get.mockReset()
  })

  it('renders the hero, capabilities, and CTAs for signed-out visitors', () => {
    renderAt('/', <LandingPage />)
    expect(screen.getByText(/Connect world events to the markets they move/i)).toBeInTheDocument()
    expect(screen.getByText('The no-fabrication guarantee')).toBeInTheDocument()
    expect(screen.getByText('Live event ingestion')).toBeInTheDocument()
    expect(screen.getByText('ATLAS, evidence-grounded')).toBeInTheDocument()
    expect(screen.getAllByText('Create account').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sign in').length).toBeGreaterThan(0)
  })

  it('links the sign-in CTA to /login', () => {
    renderAt('/', <LandingPage />)
    const links = screen.getAllByText('Sign in').map(el => el.closest('a')?.getAttribute('href'))
    expect(links).toContain('/login')
  })

  it('greets a signed-in user and links to the workspace', async () => {
    post.mockResolvedValue({ data: tokenPayload })
    renderAt(
      '/',
      <>
        <SignedInProbe />
        <LandingPage />
      </>,
    )
    screen.getByText('sign-in').click()
    await waitFor(() => expect(screen.getByText(/Welcome back, Atlas/)).toBeInTheDocument())
    expect(screen.getAllByText('Open workspace').length).toBeGreaterThan(0)
    expect(screen.queryByText('Create account')).not.toBeInTheDocument()
  })
})

describe('AuthPage (login mode)', () => {
  beforeEach(() => {
    localStorage.clear()
    post.mockReset()
    get.mockReset()
  })

  it('renders the captcha challenge from the backend', async () => {
    get.mockResolvedValue({
      data: { captcha_id: 'cap-1', svg: '<svg>challenge</svg>', kind: 'sum', expires_in: 300 },
    })
    renderAt('/login', <AuthPage mode="login" />)
    await waitFor(() => expect(get).toHaveBeenCalledWith('/auth/captcha', { timeout: 8000 }))
    expect(await screen.findByText('Enter the sum shown on the left.')).toBeInTheDocument()
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
  })

  it('shows an error when the captcha cannot be fetched', async () => {
    get.mockRejectedValue(new Error('backend offline'))
    renderAt('/login', <AuthPage mode="login" />)
    expect(await screen.findByText(/Could not load the security check/)).toBeInTheDocument()
  })

  it('blocks submission until the security check is answered', async () => {
    get.mockResolvedValue({
      data: { captcha_id: 'cap-1', svg: '<svg>x</svg>', kind: 'code', expires_in: 300 },
    })
    renderAt('/login', <AuthPage mode="login" />)
    await screen.findByText('Type the characters shown on the left.')

    // jsdom enforces `required` constraint validation on button-click submits,
    // so drive the submit event directly to exercise the app's own guard.
    fireEventSubmit()
    await waitFor(() =>
      expect(screen.getByText(/Complete the security check/)).toBeInTheDocument(),
    )
    expect(post).not.toHaveBeenCalled()
  })

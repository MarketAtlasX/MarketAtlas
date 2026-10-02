import axios from 'axios'

const TOKEN_KEY = 'marketatlas_token'
const USER_KEY = 'marketatlas_user'

const authApi = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

interface DemoUser {
  email: string
  display_name: string
}

// The backend's `EmailStr` rejects reserved special-use domains (e.g. `.local`)
// with HTTP 422, so a cached demo identity on one of those domains would make
// every auth attempt fail. Treat such a cached value as invalid and regenerate.
const UNUSABLE_DEMO_EMAIL = /@[^@]*\.local$/i

function isValidDemoUser(value: unknown): value is DemoUser {
  const user = value as DemoUser | null
  if (!user || typeof user.email !== 'string' || !user.email.includes('@')) return false
  return !UNUSABLE_DEMO_EMAIL.test(user.email)
}

function demoUser(): DemoUser {
  const existing = localStorage.getItem(USER_KEY)
  if (existing) {
    try {
      const parsed = JSON.parse(existing)
      if (isValidDemoUser(parsed)) return parsed
    } catch { /* fall through */ }
  }
  const rand = Math.random().toString(36).slice(2, 10)
  // `.local` is a reserved special-use TLD that the backend's EmailStr rejects
  // (HTTP 422), so the demo auth path could never establish a token. Use a
  // syntactically valid, non-deliverable documentation domain instead.
  const user: DemoUser = { email: `demo.${rand}@example.com`, display_name: 'Demo' }
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  return user
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getUserId(): string {
  const token = getToken()
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload?.sub) return String(payload.sub)
    } catch { /* fall through */ }
  }
  const user = demoUser()
  const hash = Array.from(user.email).reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 1000000, 7)
  return String(hash)
}

export async function ensureAuth(): Promise<string> {
  const cached = getToken()
  if (cached) return cached

  const user = demoUser()
  let token: string | undefined
  try {
    const resp = await authApi.post('/auth/register', {
      email: user.email,
      password: 'demo-password',
      display_name: user.display_name,
    })
    token = resp.data?.access_token
  } catch { /* email may already exist */ }

  if (!token) {
    const resp = await authApi.post('/auth/login', {
      email: user.email,
      password: 'demo-password',
    })
    token = resp.data?.access_token
  }

  if (!token) throw new Error('Unable to authenticate demo user')
  setToken(token)
  return token
}

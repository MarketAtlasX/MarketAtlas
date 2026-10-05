/**
 * Single source of truth for the browser-side auth session.
 *
 * Stores the JWT issued by `POST /api/auth/login|register` and derives the
 * acting user id from its `sub` claim. There is deliberately no silent
 * "demo" auto-registration here: unauthenticated visitors are unauthenticated,
 * and the protected routes redirect them to the login page.
 */

const TOKEN_KEY = 'marketatlas_token'
const ANON_ID_KEY = 'marketatlas_anon_id'

export interface AuthUser {
  id: number
  email: string
  display_name: string
  is_active: boolean
  created_at: string
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * Decode the JWT `sub` claim without verifying the signature — verification
 * is the backend's job on every request; this only routes client behaviour
 * (e.g. which conversation bucket chat history lands in).
 */
export function getUserId(): string {
  const token = getToken()
  if (token) {
    try {
      const [, payload] = token.split('.')
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
      if (decoded?.sub) return String(decoded.sub)
    } catch { /* fall through to the anonymous id */ }
  }
  return getAnonId()
}

/**
 * Stable per-browser id for anonymous visitors, used to key server-side chat
 * history before an account exists. Random and meaningless beyond that.
 */
export function getAnonId(): string {
  let id = localStorage.getItem(ANON_ID_KEY)

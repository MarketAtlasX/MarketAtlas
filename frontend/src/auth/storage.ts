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

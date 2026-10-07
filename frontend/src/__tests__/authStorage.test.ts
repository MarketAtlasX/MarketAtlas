import { afterEach, describe, expect, it } from 'vitest'
import { clearToken, getAnonId, getUserId, getToken, setToken } from '../auth/storage'

const makeJwt = (sub: string | number) =>
  [
    'eyJhbGciOiJIUzI1NiJ9',
    btoa(JSON.stringify({ sub })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    'sig',
  ].join('.')

describe('auth storage', () => {
  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('stores, reads, and clears the session token', () => {
    expect(getToken()).toBeNull()
    setToken('token-abc')
    expect(getToken()).toBe('token-abc')
    clearToken()
    expect(getToken()).toBeNull()
  })

  it('derives the user id from the JWT sub claim', () => {
    setToken(makeJwt(42))
    expect(getUserId()).toBe('42')
  })

  it('falls back to a stable anonymous id without a token', () => {
    const first = getUserId()
    const second = getUserId()
    expect(first).toBeTruthy()
    expect(first).toBe(second)
  })

  it('keeps anon id stable across a logout (chat history keying)', () => {
    const anon = getAnonId()
    setToken(makeJwt(7))
    clearToken()
    expect(getUserId()).toBe(anon)
  })

  it('persists in localStorage when remember me is on (default)', () => {
    setToken('remembered', true)
    expect(localStorage.getItem('marketatlas_token')).toBe('remembered')
    expect(sessionStorage.getItem('marketatlas_token')).toBeNull()
    expect(getToken()).toBe('remembered')
  })

  it('keeps the token session-only when remember me is off', () => {
    setToken('session-only', false)
    expect(sessionStorage.getItem('marketatlas_token')).toBe('session-only')
    expect(localStorage.getItem('marketatlas_token')).toBeNull()
    expect(getToken()).toBe('session-only')
  })

  it('prefers the session-scoped token over a stale remembered one', () => {
    setToken('remembered')
    setToken('session-only', false)
    expect(getToken()).toBe('session-only')
  })

  it('clears the token from both stores', () => {
    setToken('remembered')
    sessionStorage.setItem('marketatlas_token', 'stray')
    clearToken()
    expect(getToken()).toBeNull()
  })
})

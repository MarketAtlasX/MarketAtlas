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
})

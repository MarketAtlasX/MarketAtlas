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

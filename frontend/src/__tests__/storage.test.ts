import { describe, it, expect, beforeEach } from 'vitest'
import { safeGetStorage, safeSetStorage, safeRemoveStorage } from '../utils/storage'

describe('storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('stores and retrieves serialized data', () => {
    const data = { theme: 'dark', count: 42 }
    expect(safeSetStorage('test-key', data)).toBe(true)
    expect(safeGetStorage('test-key', null)).toEqual(data)
  })

  it('returns fallback for non-existent keys', () => {
    expect(safeGetStorage('missing', 'default')).toBe('default')
  })

  it('removes keys properly', () => {
    safeSetStorage('to-remove', 'val')
    expect(safeRemoveStorage('to-remove')).toBe(true)
    expect(safeGetStorage('to-remove', null)).toBeNull()
  })
})

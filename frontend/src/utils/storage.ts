/**
 * Safe localStorage wrapper with SSR and exception handling.
 */

export function safeGetStorage<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function safeSetStorage<T>(key: string, value: T): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function safeRemoveStorage(key: string): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false
    window.localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

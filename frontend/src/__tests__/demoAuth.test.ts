import { beforeEach, describe, expect, it, vi } from 'vitest'

// Capture the demo register/login payloads without touching the network.
const { post } = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('axios', () => ({ default: { create: () => ({ post }) } }))

import { ensureAuth } from '../simulation/auth'

describe('demo auth identity', () => {
  beforeEach(() => {
    localStorage.clear()
    post.mockReset()
    post.mockResolvedValue({ data: { access_token: 'token-123' } })
  })

  it('registers a demo user on a domain the backend EmailStr accepts', async () => {
    await ensureAuth()

    expect(post).toHaveBeenCalledWith('/auth/register', expect.objectContaining({ email: expect.any(String) }))
    const { email } = post.mock.calls[0][1] as { email: string }
    // A reserved special-use TLD (e.g. `.local`) is rejected by the backend with
    // HTTP 422, which previously broke the entire demo auth path.
    expect(email).not.toMatch(/\.local$/i)
    expect(email).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]+$/i)
  })

  it('discards a cached demo identity that used a reserved domain', async () => {
    localStorage.setItem('marketatlas_user', JSON.stringify({ email: 'demo.old@marketatlas.local', display_name: 'Demo' }))

    await ensureAuth()

    const { email } = post.mock.calls[0][1] as { email: string }
    expect(email).not.toMatch(/\.local$/i)
  })
})

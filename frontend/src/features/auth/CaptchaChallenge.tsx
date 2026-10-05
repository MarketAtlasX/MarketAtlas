import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, ShieldCheck } from 'lucide-react'
import { api } from '../../api/client'

interface CaptchaPayload {
  captcha_id: string
  svg: string
  kind: string
  expires_in: number
}

interface CaptchaChallengeProps {
  /** Called whenever a fresh challenge is issued; the answer must match it. */
  onChallenge: (captchaId: string) => void
  /** Bumped by the parent when submission fails and a new challenge is needed. */
  refreshToken: number
}

/**
 * Server-issued captcha: the backend generates a distorted SVG challenge and
 * stores the expected answer keyed by a one-time id. The browser only ever
 * sees the SVG — the answer never travels to the client, so it cannot be
 * read out of the page.
 */
export default function CaptchaChallenge({ onChallenge, refreshToken }: CaptchaChallengeProps) {
  const [challenge, setChallenge] = useState<CaptchaPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<CaptchaPayload>('/auth/captcha', { timeout: 8000 })
      setChallenge(data)
      onChallenge(data.captcha_id)
    } catch {
      setError('Could not load the security check. The backend may be offline.')
    } finally {
      setLoading(false)
    }
  }, [onChallenge])

  useEffect(() => {
    void load()
  }, [load, refreshToken])

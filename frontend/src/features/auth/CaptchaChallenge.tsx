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

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--text-mid)]">
          Security check
        </label>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          title="New challenge"
          aria-label="Request a new captcha challenge"
          className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--text-lo)] transition-colors hover:text-[var(--accent)] disabled:opacity-40"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : undefined} />
          New
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex h-[52px] w-[190px] shrink-0 items-center justify-center rounded border border-[var(--line)] bg-[#0d1418]">
          {challenge ? (
            // The SVG comes from our own backend (it only ever contains the
            // distorted challenge text) and needs inline rendering to display.
            <div dangerouslySetInnerHTML={{ __html: challenge.svg }} />
          ) : loading ? (
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--text-lo)] animate-breathe">
              Loading…
            </span>
          ) : (
            <span className="px-2 text-center text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--critical)]">
              {error ?? 'Unavailable'}
            </span>
          )}
        </div>
        <p className="flex items-start gap-1.5 text-[10px] leading-snug text-[var(--text-lo)]">
          <ShieldCheck size={12} className="mt-0.5 shrink-0 text-[var(--accent)]" />
          {challenge?.kind === 'sum'
            ? 'Enter the sum shown on the left.'
            : 'Type the characters shown on the left.'}
        </p>
      </div>
    </div>
  )
}

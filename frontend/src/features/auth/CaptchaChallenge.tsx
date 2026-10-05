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

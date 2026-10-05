import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, ShieldCheck } from 'lucide-react'
import { api } from '../../api/client'

interface CaptchaPayload {
  captcha_id: string
  svg: string
  kind: string
  expires_in: number
}

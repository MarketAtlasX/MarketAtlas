import { useCallback, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, AtSign, KeyRound, Loader2, ShieldCheck, User } from 'lucide-react'
import { authErrorMessage, useAuth } from '../../context/AuthContext'
import CaptchaChallenge from './CaptchaChallenge'

type Mode = 'login' | 'register'

interface AuthPageProps {
  mode: Mode
}

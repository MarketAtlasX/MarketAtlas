import { useState, useCallback } from 'react'
import type { PredictionResult } from '../../api/client'

const QUICK_TICKERS = ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'XOM', 'SHEL', 'TSMC', 'GC'] as const

interface PredictionSpaceProps {
  selectedEntity?: string | null
  onPredictionLoaded?: (ticker: string, prediction: PredictionResult) => void
  className?: string
}

export default function PredictionSpace({
  selectedEntity,
  onPredictionLoaded,
  className = '',
}: PredictionSpaceProps) {
  const [tickerInput, setTickerInput] = useState('')

  return (
    <div className={className}>
      <span>PREDICTION SPACE</span>
    </div>
  )
}

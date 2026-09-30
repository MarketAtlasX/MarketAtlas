/**
 * Ticker symbol sanitization and validation helpers.
 */

const TICKER_RE = /^[A-Z0-9.\-]{1,10}$/

export function cleanTicker(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, '')
}

export function isValidTicker(ticker: string): boolean {
  const cleaned = cleanTicker(ticker)
  return cleaned.length > 0 && cleaned.length <= 10 && TICKER_RE.test(cleaned)
}

const COMMON_NAMES: Record<string, string> = {
  NVDA: 'NVIDIA Corporation',
  AAPL: 'Apple Inc.',
  MSFT: 'Microsoft Corporation',
  AMZN: 'Amazon.com Inc.',
  TSLA: 'Tesla, Inc.',
  GOOGL: 'Alphabet Inc.',
  META: 'Meta Platforms, Inc.',
  XOM: 'Exxon Mobil Corporation',
  JPM: 'JPMorgan Chase & Co.',
}

export function getSymbolDisplayName(ticker: string): string {
  const clean = cleanTicker(ticker)
  return COMMON_NAMES[clean] || `${clean} Enterprise`
}

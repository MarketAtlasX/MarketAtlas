/**
 * Extended market telemetry and order book interfaces.
 */

export interface OrderBookLevel {
  price: number
  volume: number
  ordersCount: number
}

export interface MarketDepth {
  symbol: string
  timestamp: string
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
  spread: number
}

export interface TradingSessionStatus {
  market: 'NYSE' | 'NASDAQ' | 'LSE' | 'TSE' | 'GLOBAL'
  isOpen: boolean
  sessionType: 'pre' | 'regular' | 'post' | 'closed'
  nextEvent: string
}

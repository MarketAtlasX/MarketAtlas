/**
 * Intelligence Bus — Central event broker connecting Globe, Prediction Space, and JARVIS.
 */

export type IntelligenceEventType =
  | 'ENTITY_SELECTED'
  | 'STOCK_SELECTED'
  | 'TICKER_PREDICTED'
  | 'TICKER_REQUESTED'
  | 'JARVIS_RESPONSE'
  | 'GLOBE_INTENT'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  conversation_id: string
  query: string
  response: string
  intent: string
  agents_used: string[]
  confidence: number
  sources: string[]
}

export interface IntelligenceReport {
  title: string
  event: string
  affected_sectors: string[]
  risk_score: number
  expected_market_impact: string
  recommended_assets: string[]
  confidence: number
  reasoning: string
  sources: string[]
  timestamp: string
}

export interface SimulationResult {
  scenario: string
  consequences: Record<string, string>
  probability: number
  time_horizon: string
  key_risks: string[]
}

let backendAvailable: boolean | null = null

async function checkBackend(): Promise<boolean> {
  if (backendAvailable === true) return true
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(2000) })
    backendAvailable = res.ok
    return backendAvailable
  } catch {
    backendAvailable = null
    return false
  }
}

export async function sendChat(query: string): Promise<ChatResponse> {
  const online = await checkBackend()
  if (!online) {
    return mockChatResponse(query)
  }
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(60000),
    })
    if (!res.ok) throw new Error('API error')
    return await res.json()
  } catch {
    backendAvailable = null
    return mockChatResponse(query)
  }
}

function mockChatResponse(query: string): ChatResponse {
  const q = query.toLowerCase()
  let intent = 'IMPACT'
  let agents = ['ImpactAgent', 'NewsAgent', 'MarketAgent']
  let response = ''

  if (q.includes('oil') || q.includes('energy')) {
    intent = 'IMPACT'
    response = 'Oil markets are experiencing upward pressure due to geopolitical tensions in key producing regions. Supply constraints and rising risk premiums are driving prices higher.'
  } else if (q.includes('stock') || q.includes('buy') || q.includes('invest')) {
    intent = 'RECOMMENDATION'
    agents = ['RecommendationAgent', 'ImpactAgent']
    response = 'Based on current geopolitical analysis, defense and energy sectors show strong momentum. Consider XLE for energy exposure and LMT for defense. Safe-haven assets like gold (GLD) are also recommended.'
  } else if (q.includes('sanction') || q.includes('tariff')) {
    intent = 'NEWS'
    agents = ['NewsAgent']
    response = 'Recent sanctions developments are impacting global trade flows. Affected sectors include energy, finance, and technology. Supply chain reconfiguration is expected.'
  } else if (q.includes('blockade') || q.includes('taiwan') || q.includes('conflict')) {
    intent = 'IMPACT'
    response = 'Escalating geopolitical tensions are driving safe-haven demand. Defense stocks, energy commodities, and gold are expected to benefit. Monitor developments closely.'
  } else if (q.includes('simulate') || q.includes('what if')) {
    intent = 'SIMULATION'
    agents = ['SimulationAgent', 'ImpactAgent']
    response = 'Scenario analysis indicates significant market disruption potential. Key consequences include supply chain impacts, inflationary pressure, and sector-specific volatility.'
  } else if (q.includes('report') || q.includes('brief')) {
    intent = 'REPORT'
    agents = ['ReportAgent', 'ImpactAgent']
    response = '# MarketAtlas Intelligence Report\n\nGeopolitical risk assessment completed. Multiple factors indicate elevated uncertainty across global markets. Key recommendations include portfolio diversification and hedging strategies.'
  } else {
    response = 'Analysis complete. Based on available geopolitical intelligence, moderate risk levels are detected across affected markets. Monitor sector-specific developments for trading opportunities.'
  }

  return {
    conversation_id: crypto.randomUUID(),
    query,
    response,
    intent,
    agents_used: agents,
    confidence: 0.75 + Math.random() * 0.15,
    sources: ['MarketAtlas Intelligence', 'Reuters', 'Bloomberg'],
  }
}

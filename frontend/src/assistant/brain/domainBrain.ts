import { createCommand, type AtlasCommand } from '../commands/commandTypes'

export interface DomainResponse {
  text: string
  commands: AtlasCommand[]
}

const INTENTS: { keys: RegExp; build: () => DomainResponse }[] = [
  {
    keys: /\b(taiwan|tsmc|strait|chip|semiconductor)\b/i,
    build: () => ({
      text: 'There has been a significant increase in semiconductor supply-chain risk around Taiwan. I am running an impact analysis on TSMC, NVIDIA, Apple and the broader semiconductor sector.',
      commands: [
        createCommand('FOCUS_COUNTRY', { country: 'Taiwan', animation: 'cinematic' }),
        createCommand('HIGHLIGHT_COMPANY', { company: 'TSMC' }),
        createCommand('SHOW_ROUTE', { from: 'Taiwan', to: 'United States', route_type: 'semiconductor_supply_chain' }),
        createCommand('SHOW_RISK', { region: 'Taiwan Strait' }),
        createCommand('OPEN_MARKET', { sector: 'Semiconductors' }),
      ],
    }),
  },
  {
    keys: /\b(world risk|risk level|global risk|how risky)\b/i,
    build: () => ({
      text: 'Current world risk is elevated at 68 percent, driven primarily by the Taiwan Strait and the Middle East. I am highlighting the highest-risk corridors.',
      commands: [
        createCommand('FOCUS_COUNTRY', { country: 'Iran', animation: 'cinematic' }),
        createCommand('SHOW_RISK', { region: 'Middle East' }),
        createCommand('SHOW_GRAPH', { graph: 'causal' }),
      ],
    }),
  },
  {
    keys: /\b(iran|middle east|oil|brent|energy)\b/i,
    build: () => ({
      text: 'Middle East tension is pressuring energy markets. Brent crude is up sharply, and the strongest transmission channel is oil price inflation into global growth.',
      commands: [
        createCommand('FOCUS_COUNTRY', { country: 'Iran', animation: 'cinematic' }),
        createCommand('SHOW_ROUTE', { from: 'Iran', to: 'Europe', route_type: 'energy' }),
        createCommand('OPEN_MARKET', { sector: 'Energy' }),
      ],
    }),
  },
  {
    keys: /\b(nvidia|nvda|market|stock|forecast|apple|tsmc adr)\b/i,
    build: () => ({
      text: 'NVIDIA has the highest direct exposure among monitored companies, driven by the Taiwan semiconductor channel. The forecast band is widening with elevated downside risk.',
      commands: [
        createCommand('OPEN_MARKET', { symbol: 'NVDA' }),
        createCommand('HIGHLIGHT_COMPANY', { company: 'NVIDIA' }),
        createCommand('SHOW_GRAPH', { graph: 'forecast', entity: 'NVDA' }),
      ],
    }),
  },
  {
    keys: /\b(graph|causal|reasoning|trace|why)\b/i,
    build: () => ({
      text: 'Opening the causal graph. The dominant path runs from Taiwan through TSMC to NVIDIA, then into the broader semiconductor and technology sector.',
      commands: [createCommand('SHOW_GRAPH', { graph: 'causal', entity: 'NVDA' })],
    }),
  },
  {
    keys: /\b(simulate|scenario|what if)\b/i,
    build: () => ({
      text: 'Opening the scenario simulator. I can model a reduction in Taiwan semiconductor exports and propagate it through the world state.',
      commands: [createCommand('RUN_SIMULATION', { scenario: 'taiwan_escalation' })],
    }),
  },
  {
    keys: /\b(memory|similar|before|analogous|analogue)\b/i,
    build: () => ({
      text: 'Searching world memory for analogous episodes. The closest match is the 2022 semiconductor supply shock.',
      commands: [createCommand('SEARCH_MEMORY', { query: 'semiconductor supply shock' })],
    }),
  },
  {
    keys: /\b(zoom out|zoom|globe|show me the world)\b/i,
    build: () => ({
      text: 'Returning to the world view.',
      commands: [createCommand('ZOOM_GLOBE', { level: 'world' })],
    }),
  },
]

const GREETING: RegExp = /\b(hello|hi|hey|good morning|good evening|atlas)\b/i

export function domainBrain(transcript: string): DomainResponse {
  const match = INTENTS.find(intent => intent.keys.test(transcript))
  if (match) {
    return match.build()
  }
  if (GREETING.test(transcript)) {
    return {
      text: 'Good morning. MarketAtlas is online. World risk is elevated. Ask me about Taiwan, the Middle East, markets, or the causal graph.',
      commands: [],
    }
  }
  return {
    text: 'I am listening. Try asking about world risk, Taiwan, the markets, or the causal graph.',
    commands: [],
  }
}

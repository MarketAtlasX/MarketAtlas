import { createCommand, type AtlasCommand } from '../commands/commandTypes'
import type { AtlasState } from '../../stores/AtlasStore'

export interface AtlasPlanStep {
  id: string
  label: string
  tool: string
  args: Record<string, unknown>
  command: AtlasCommand
}

export interface AtlasPlan {
  query: string
  steps: AtlasPlanStep[]
  responseHint: string
}

const COMPANY_SYMBOLS: Record<string, string> = {
  NVIDIA: 'NVDA',
  NVDA: 'NVDA',
  AMD: 'AMD',
  TSMC: 'TSMC',
  APPLE: 'AAPL',
  AAPL: 'AAPL',
  EXXON: 'XOM',
  OIL: 'XOM',
}

const COUNTRY_NAMES = ['Japan', 'Taiwan', 'China', 'United States', 'USA', 'Iran', 'Russia', 'Ukraine', 'Germany', 'France', 'South Korea']

function findCountry(query: string, state: AtlasState): string | null {
  const match = COUNTRY_NAMES.find(country => query.toLowerCase().includes(country.toLowerCase()))
  return match ?? state.selectedCountry
}

function findCompany(query: string, state: AtlasState): string | null {
  const upper = query.toUpperCase()
  const match = Object.keys(COMPANY_SYMBOLS).find(company => upper.includes(company))
  return match ?? state.selectedCompany
}

function step(id: string, label: string, tool: string, args: Record<string, unknown>, commandType: Parameters<typeof createCommand>[0]): AtlasPlanStep {
  return { id, label, tool, args, command: createCommand(commandType, { ...args, tool }) }
}

export function planAtlasRequest(query: string, state: AtlasState): AtlasPlan {
  const lower = query.toLowerCase()
  const country = findCountry(query, state)
  const company = findCompany(query, state)
  const symbol = company ? COMPANY_SYMBOLS[company.toUpperCase()] : state.chartSymbol
  const steps: AtlasPlanStep[] = []

  if (lower.includes('go back') || lower.includes('reset') || lower.includes('show me the world')) {
    steps.push(step('reset', 'Restoring the global view', 'reset_globe', {}, 'ZOOM_GLOBE'))
    return { query, steps, responseHint: 'I restored the global view.' }
  }

  if (lower.includes('compare') && (company || state.selectedCompany)) {
    const symbols = Array.from(new Set([symbol, 'AMD'].filter(Boolean)))
    steps.push(step('compare', `Comparing ${symbols.join(' and ')}`, 'compare_stocks', { symbols: symbols.join(',') }, 'OPEN_MARKET'))
    steps.push(step('focus', 'Keeping the geographic context visible', 'show_connections', { entity: state.selectedCountry ?? company ?? 'market' }, 'SHOW_NETWORK'))
    return { query, steps, responseHint: `I am comparing ${symbols.join(' and ')} in the current geographic context.` }
  }

  if (company) {
    const geographic = country ?? (company.toUpperCase() === 'NVIDIA' || company.toUpperCase() === 'AMD' ? 'Taiwan' : null)
    if (geographic) steps.push(step('location', `Locating ${geographic}`, 'focus_country', { country: geographic }, 'FOCUS_COUNTRY'))
    if (lower.includes('risk') || lower.includes('vulnerable') || lower.includes('why')) {
      steps.push(step('layer', 'Activating geopolitical risk', 'show_globe_layer', { layer: 'geopolitics' }, 'SHOW_RISK'))
      steps.push(step('impact', `Tracing exposure into ${company}`, 'trace_market_impact', { entity: company }, 'SHOW_GRAPH'))
    }
    steps.push(step('company', `Highlighting ${company}`, 'select_company', { company }, 'HIGHLIGHT_COMPANY'))
    steps.push(step('market', `Opening ${symbol ?? company}`, 'show_stock', { symbol: symbol ?? company }, 'OPEN_MARKET'))
    return { query, steps, responseHint: `I am showing ${company} with its geographic and market context.` }
  }

  if (country) {
    steps.push(step('country', `Locating ${country}`, 'focus_country', { country }, 'FOCUS_COUNTRY'))
    if (lower.includes('company') || lower.includes('companies') || lower.includes('affected')) {
      steps.push(step('exposure', 'Showing exposed companies', 'show_connections', { entity: country }, 'SHOW_NETWORK'))
      steps.push(step('market', 'Opening related market context', 'show_market', { panel: 'market' }, 'OPEN_MARKET'))
    } else if (lower.includes('happening') || lower.includes('risk') || lower.includes('geopolitical')) {
      steps.push(step('risk', 'Loading geopolitical intelligence', 'analyze_geopolitical_risk', { entity: country }, 'SHOW_RISK'))
    }
    return { query, steps, responseHint: `I moved the globe to ${country} and opened the relevant intelligence.` }
  }

  if (lower.includes('oil') || lower.includes('commodity')) {
    steps.push(step('region', 'Moving to the Persian Gulf risk surface', 'focus_region', { region: 'Persian Gulf' }, 'FOCUS_REGION'))
    steps.push(step('layer', 'Activating commodity and route intelligence', 'show_globe_layer', { layer: 'commodities' }, 'SHOW_ROUTE'))
    steps.push(step('market', 'Opening oil market context', 'show_commodity', { commodity: 'Oil' }, 'OPEN_MARKET'))
    return { query, steps, responseHint: 'I am showing the oil market with the relevant geopolitical route context.' }
  }

  steps.push(step('summary', 'Opening the market intelligence surface', 'summarize_market', {}, 'OPEN_MARKET'))
  return { query, steps, responseHint: 'I opened the market intelligence surface. Some live evidence may be unavailable.' }
}

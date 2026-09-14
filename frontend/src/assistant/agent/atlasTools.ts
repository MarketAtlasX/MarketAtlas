import { commandBus } from '../commands/commandBus'
import { createCommand, type AtlasCommand } from '../commands/commandTypes'
import { resolveCoords } from '../../features/globe/globeData'
import { resolveCompanyLocation } from '../../data/companyLocations'

export interface AtlasToolContext {
  currentQuery: string
  previousEntity: string | null
  selectedCompany: string | null
}

export interface AtlasToolResult {
  tool: string
  ok: boolean
  message: string
  command?: AtlasCommand
  error?: string
  observation?: Record<string, unknown>
}

export interface AtlasEvidenceObservation {
  status: 'live' | 'historical' | 'unavailable' | 'degraded'
  freshness: string
  event?: Record<string, unknown>
  impacts?: Record<string, unknown>[]
  sources?: Record<string, unknown>[]
  provenance?: Record<string, unknown>
  limitations?: string[]
  evidence?: Record<string, unknown>[]
}

export interface AtlasToolDefinition<TArgs extends Record<string, unknown> = Record<string, unknown>> {
  name: string
  description: string
  validate: (args: Record<string, unknown>) => boolean
  execute: (args: TArgs, context: AtlasToolContext) => AtlasToolResult
  parameters: { type: 'object'; properties: Record<string, { type: string; description: string }>; required: string[]; additionalProperties: false }
}

function hasValue(args: Record<string, unknown>, key: string): boolean {
  const value = args[key]
  if (Array.isArray(value)) return value.length > 0
  return typeof value === 'string' && value.trim().length > 0
}

function toolCommand(name: string, type: Parameters<typeof createCommand>[0], args: Record<string, unknown>, message: string): AtlasToolResult {
  const command = createCommand(type, { ...args, tool: name })
  commandBus.emit(command)
  const location = String(args.country ?? args.location ?? args.city ?? args.region ?? '')
  const coordinates = location ? resolveCoords(location) : null
  const company = args.company ? resolveCompanyLocation(String(args.company)) : null
  return {
    tool: name,
    ok: true,
    message,
    command,
    observation: {
      success: true,
      tool: name,
      arguments: args,
      ...(coordinates ? { camera: { latitude: coordinates.lat, longitude: coordinates.lng, altitude: 1.58 }, selectedEntity: location } : {}),
      ...(company ? { selectedCompany: company.ticker, headquarters: company.headquarters.country } : {}),
      ...(args.layer ? { activeLayer: args.layer } : {}),
    },
  }
}

function simpleTool(
  name: string,
  description: string,
  type: Parameters<typeof createCommand>[0],
  required: string[] = [],
  message = `${name} executed`,
): AtlasToolDefinition {
  const properties = Object.fromEntries(required.map(key => [key, { type: key === 'symbols' || key === 'entities' ? 'string' : 'string', description: `${key} used by Atlas` }]))
  return {
    name,
    description,
    validate: args => required.every(key => hasValue(args, key)),
    parameters: { type: 'object', properties, required, additionalProperties: false },
    execute: (args, context) => {
      const resolved = { ...args }
      if (name === 'select_company' && !resolved.company && context.selectedCompany) resolved.company = context.selectedCompany
      return toolCommand(name, type, resolved, message)
    },
  }
}

export const atlasTools: AtlasToolDefinition[] = [
  simpleTool('rotate_to_location', 'Rotate the globe to a named location.', 'FOCUS_COUNTRY', ['location'], 'Moving the globe to the requested location.'),
  simpleTool('zoom_to_location', 'Zoom the globe to a named location.', 'FOCUS_COUNTRY', ['location'], 'Zooming into the requested location.'),
  simpleTool('focus_country', 'Focus and select a country.', 'FOCUS_COUNTRY', ['country'], 'Country selected.'),
  simpleTool('focus_city', 'Focus the globe on a city.', 'FOCUS_COUNTRY', ['city'], 'City focus requested.'),
  simpleTool('focus_region', 'Focus the globe on a region.', 'FOCUS_REGION', ['region'], 'Regional focus requested.'),
  simpleTool('select_country', 'Select a country in the world model.', 'FOCUS_COUNTRY', ['country'], 'Country selected.'),
  simpleTool('select_event', 'Select a geopolitical or market event.', 'SHOW_CONFLICT', ['event'], 'Event selected for inspection.'),
  simpleTool('select_company', 'Select a company and its geographic context.', 'HIGHLIGHT_COMPANY', ['company'], 'Company exposure selected.'),
  simpleTool('highlight_entities', 'Highlight one or more entities on the globe.', 'VISUALIZE', ['entities'], 'Entities highlighted.'),
  simpleTool('clear_highlights', 'Clear active visual highlights.', 'ZOOM_GLOBE', [], 'Highlights cleared.'),
  simpleTool('show_globe_layer', 'Activate a named intelligence layer.', 'VISUALIZE', ['layer'], 'Intelligence layer activated.'),
  simpleTool('hide_globe_layer', 'Return to the base world layer.', 'VISUALIZE', [], 'Overlay layer hidden.'),
  simpleTool('trace_route', 'Trace a route between two locations or nodes.', 'SHOW_ROUTE', ['from', 'to'], 'Route trace activated.'),
  simpleTool('show_connections', 'Show causal or supply-chain connections.', 'SHOW_NETWORK', ['entity'], 'Connections displayed.'),
  simpleTool('reset_globe', 'Reset the globe to its global view.', 'ZOOM_GLOBE', [], 'Globe reset.'),

  simpleTool('show_stock', 'Show a stock and its geographic context.', 'OPEN_MARKET', ['symbol'], 'Stock context opened.'),
  simpleTool('show_stock_chart', 'Open a stock chart.', 'OPEN_MARKET', ['symbol'], 'Stock chart opened.'),
  simpleTool('compare_stocks', 'Compare multiple stocks.', 'OPEN_MARKET', ['symbols'], 'Stock comparison opened.'),
  simpleTool('show_index', 'Show an index.', 'OPEN_MARKET', ['index'], 'Index view opened.'),
  simpleTool('show_sector', 'Show a sector.', 'OPEN_MARKET', ['sector'], 'Sector view opened.'),
  simpleTool('show_commodity', 'Show a commodity and its geographic exposure.', 'OPEN_MARKET', ['commodity'], 'Commodity view opened.'),
  simpleTool('show_currency', 'Show a currency.', 'OPEN_MARKET', ['currency'], 'Currency view opened.'),
  simpleTool('show_market', 'Show a market overview.', 'OPEN_MARKET', [], 'Market view opened.'),
  simpleTool('show_watchlist', 'Show the current watchlist.', 'OPEN_MARKET', [], 'Watchlist opened.'),

  simpleTool('open_panel', 'Open a dashboard panel.', 'OPEN_MARKET', ['panel'], 'Panel opened.'),
  simpleTool('close_panel', 'Close the active dashboard panel.', 'VISUALIZE', [], 'Panel closed.'),
  simpleTool('focus_panel', 'Focus a dashboard panel.', 'OPEN_MARKET', ['panel'], 'Panel focused.'),
  simpleTool('switch_tab', 'Switch the active dashboard tab.', 'VISUALIZE', ['tab'], 'Dashboard tab switched.'),
  simpleTool('set_timeframe', 'Set the active market timeframe.', 'OPEN_MARKET', ['timeframe'], 'Timeframe updated.'),
  simpleTool('search_market', 'Search for a market entity.', 'OPEN_MARKET', ['query'], 'Market search opened.'),
  simpleTool('change_view', 'Change the dashboard view.', 'VISUALIZE', ['view'], 'Dashboard view changed.'),

  simpleTool('analyze_event', 'Analyze an event and its market consequences.', 'SHOW_CONFLICT', ['event'], 'Event analysis requested.'),
  simpleTool('analyze_geopolitical_risk', 'Analyze geopolitical risk around an entity.', 'SHOW_RISK', [], 'Geopolitical risk analysis requested.'),
  simpleTool('trace_market_impact', 'Trace an event into markets and companies.', 'SHOW_GRAPH', ['entity'], 'Market impact trace requested.'),
  simpleTool('trace_supply_chain', 'Trace supply-chain dependencies.', 'SHOW_ROUTE', ['from', 'to'], 'Supply-chain trace requested.'),
  simpleTool('analyze_company_exposure', 'Analyze a company geographic exposure.', 'HIGHLIGHT_COMPANY', ['company'], 'Company exposure analysis requested.'),
  simpleTool('compare_scenarios', 'Compare scenario outcomes.', 'RUN_SIMULATION', ['scenario'], 'Scenario comparison requested.'),
  simpleTool('summarize_market', 'Summarize current market conditions.', 'OPEN_MARKET', [], 'Market summary requested.'),
]

const registry = new Map(atlasTools.map(tool => [tool.name, tool]))

export const atlasToolSchemas = atlasTools.map(tool => ({
  type: 'function' as const,
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  },
}))

export function getAtlasTool(name: string): AtlasToolDefinition | undefined {
  return registry.get(name)
}

export function executeAtlasTool(name: string, args: Record<string, unknown>, context: AtlasToolContext): AtlasToolResult {
  const tool = registry.get(name)
  if (!tool) return { tool: name, ok: false, message: '', error: `Unknown Atlas tool: ${name}` }
  if (!tool.validate(args)) return { tool: name, ok: false, message: '', error: `Invalid arguments for ${name}` }
  try {
    return tool.execute(args, context)
  } catch (error) {
    return { tool: name, ok: false, message: '', error: error instanceof Error ? error.message : `Failed to execute ${name}` }
  }
}

const EVIDENCE_TOOLS = new Set([
  'analyze_event',
  'analyze_geopolitical_risk',
  'trace_market_impact',
  'trace_supply_chain',
  'analyze_company_exposure',
  'summarize_market',
])

export async function executeAtlasToolAsync(
  name: string,
  args: Record<string, unknown>,
  context: AtlasToolContext,
  signal?: AbortSignal,
): Promise<AtlasToolResult> {
  const localResult = executeAtlasTool(name, args, context)
  if (!localResult.ok || !EVIDENCE_TOOLS.has(name)) return localResult

  const params = new URLSearchParams()
  const query = String(args.event ?? args.entity ?? args.company ?? args.region ?? args.query ?? '')
  const ticker = String(args.symbol ?? '')
  if (query) params.set('query', query)
  if (ticker) params.set('ticker', ticker)

  try {
    const response = await fetch(`/api/live-events/observation?${params.toString()}`, { signal })
    const observation = await response.json() as AtlasEvidenceObservation
    return {
      ...localResult,
      message: observation.status === 'unavailable' ? `${localResult.message} Live evidence unavailable.` : `${localResult.message} Evidence attached.`,
      observation: { ...localResult.observation, evidenceBundle: observation },
    }
  } catch (error) {
    return {
      ...localResult,
      message: `${localResult.message} Evidence service unavailable.`,
      observation: {
        ...localResult.observation,
        evidenceBundle: {
          status: 'degraded',
          freshness: 'unknown',
          limitations: [error instanceof Error ? error.message : 'Evidence service unavailable'],
        },
      },
    }
  }
}


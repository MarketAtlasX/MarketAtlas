import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorldStore } from '../../stores/WorldStore'
import { commandBus } from './commandBus'
import type { AtlasCommand } from './commandTypes'
import { globeFocusBus } from './globeFocusBus'
import { visualizationBus } from './visualizationBus'
import { createIntent, type VisualizationIntent } from '../../features/globe/visualizationIntent'
import { useAtlasStore, type AtlasLayer } from '../../stores/AtlasStore'
import { intelligenceBus } from '../../services/intelligenceBus'
import { resolveCompanyLocation } from '../../data/companyLocations'

const COMPANY_TO_SYMBOL: Record<string, string> = {
  TSMC: 'TSMC',
  NVIDIA: 'NVDA',
  NVDA: 'NVDA',
  APPLE: 'AAPL',
  AAPL: 'AAPL',
  'EXXON MOBIL': 'XOM',
  XOM: 'XOM',
  SHELL: 'SHEL',
  SHEL: 'SHEL',
  GOLD: 'GC',
}

const SECTOR_TO_SYMBOL: Record<string, string> = {
  semiconductors: 'NVDA',
  semiconductor: 'NVDA',
  chip: 'NVDA',
  energy: 'XOM',
  oil: 'XOM',
  gold: 'GC',
  technology: 'NVDA',
  tech: 'NVDA',
}

export function AtlasCommandHandler() {
  const navigate = useNavigate()
  const { selectEntity } = useWorldStore()
  const { update, setCamera, reset } = useAtlasStore()

  useEffect(
    () =>
      commandBus.subscribe((command: AtlasCommand) => {
        const payload = command.payload

        const driveVisual = (intent: VisualizationIntent) => {
          visualizationBus.drive(intent)
          if (intent.focus?.[0]) selectEntity(intent.focus[0])
          update({
            execution: 'executing',
            activeLayer: (intent.mode === 'risk' ? 'risk' : intent.mode === 'supply' ? 'supply-chain' : intent.mode === 'map' ? 'world' : 'geopolitics') as AtlasLayer,
            highlightedEntities: intent.focus ?? [],
            lastCommand: intent.caption ?? intent.mode,
          })
          navigate('/dashboard')
        }

        switch (command.type) {
          case 'FOCUS_COUNTRY': {
            const country = String(payload.country ?? payload.location ?? payload.city ?? '')
            if (!country) break
            selectEntity(country)
            update({ selectedCountry: country, selectedCity: null, selectedEvent: null, selectedCompany: null, openPanel: 'evidence' })
            globeFocusBus.fly({ entity: country })
            driveVisual(
              createIntent({
                mode: 'country',
                scale: 'country',
                focus: [country],
                origin: country,
                camera: 'zoom_in',
                caption: `Focus: ${country}`,
              }),
            )
            break
          }
          case 'ZOOM_GLOBE':
            selectEntity(null)
            reset()
            globeFocusBus.reset()
            driveVisual(createIntent({ mode: 'globe', scale: 'global', camera: 'pullback', transition: 'particle_reform' }))
            break
          case 'SHOW_ROUTE': {
            const to = String(payload.to ?? '')
            const from = String(payload.from ?? '')
            if (to) {
              selectEntity(to)
              update({ tracedRoute: [from, to].filter(Boolean), highlightedEntities: [from, to].filter(Boolean), openPanel: 'graph' })
              globeFocusBus.fly({ entity: to })
            }
            driveVisual(
              createIntent({
                mode: 'route',
                scale: 'global',
                focus: [from, to].filter(Boolean),
                origin: from || null,
                destination: to || null,
                camera: 'pullback',
                transition: 'particle_reform',
              }),
            )
            break
          }
          case 'SHOW_RISK':
            selectEntity(null)
            driveVisual(createIntent({ mode: 'risk', scale: 'regional', camera: 'zoom_in', transition: 'disintegrate', palette: 'risk' }))
            update({ activeLayer: payload.layer === 'geopolitics' ? 'geopolitics' : 'risk', openPanel: 'analysis', execution: 'executing' })
            break
          case 'VISUALIZE': {
            const intent = payload.intent as VisualizationIntent | undefined
            if (intent) {
              driveVisual(intent)
            } else if (payload.layer) {
              const layer = String(payload.layer)
              const layerIntent = layer === 'supply-chain'
                ? createIntent({ mode: 'supply', scale: 'global', camera: 'pullback', palette: 'map', caption: 'SUPPLY CHAIN INTELLIGENCE' })
                : layer === 'commodities'
                  ? createIntent({ mode: 'route', scale: 'regional', camera: 'zoom_in', palette: 'map', caption: 'COMMODITY ROUTES' })
                  : layer === 'geopolitics'
                    ? createIntent({ mode: 'risk', scale: 'regional', camera: 'zoom_in', palette: 'risk', caption: 'GEOPOLITICAL INTELLIGENCE' })
                    : createIntent({ mode: 'globe', scale: 'global', camera: 'pullback', caption: `${layer.toUpperCase()} INTELLIGENCE` })
              driveVisual(layerIntent)
              update({ activeLayer: layer as AtlasLayer })
            }
            break
          }
          case 'FOCUS_REGION': {
            const region = String(payload.region ?? '')
            driveVisual(
              createIntent({
                mode: 'region',
                scale: 'regional',
                focus: region ? [region] : [],
                camera: 'zoom_in',
                caption: region ? `Region: ${region}` : 'Regional field',
              }),
            )
            break
          }
          case 'SHOW_CONFLICT': {
            const region = String(payload.region ?? '')
            selectEntity(null)
            driveVisual(
              createIntent({
                mode: 'conflict',
                scale: 'regional',
                focus: region ? [region] : [],
                camera: 'zoom_in',
                palette: 'risk',
                transition: 'particle_reform',
                caption: region ? `Conflict field: ${region}` : 'Conflict field',
              }),
            )
            break
          }
          case 'SHOW_NETWORK': {
            const entity = String(payload.entity ?? '')
            driveVisual(
              createIntent({
                mode: 'network',
                scale: 'global',
                focus: entity ? [entity] : [],
                camera: 'pullback',
                transition: 'particle_reform',
                caption: 'Knowledge web',
              }),
            )
            break
          }
          case 'SHOW_ABSTRACT':
            selectEntity(null)
            driveVisual(
              createIntent({
                mode: 'abstract',
                scale: 'global',
                focus: [],
                camera: 'orbit',
                transition: 'disintegrate',
                palette: 'core',
                caption: 'Abstract reasoning',
              }),
            )
            break
          case 'SHOW_GRAPH': {
            const entity = String(payload.entity ?? '')
            navigate(entity ? `/graph?entity=${encodeURIComponent(entity)}` : '/graph')
            break
          }
          case 'OPEN_MARKET': {
            const symbol = String(payload.symbol ?? '').toUpperCase()
            const symbols = String(payload.symbols ?? '').split(',').map(value => value.trim().toUpperCase()).filter(Boolean)
            const sector = String(payload.sector ?? '').toLowerCase()
            const target = COMPANY_TO_SYMBOL[symbol] ?? SECTOR_TO_SYMBOL[sector] ?? symbols[0]
            const query = symbols.length > 1 ? `symbols=${symbols.join(',')}` : target ? `symbol=${target}` : ''
            update({ chartSymbol: target ?? null, openPanel: payload.panel === 'graph' ? 'graph' : 'market', activeLayer: 'markets', execution: 'executing' })
            navigate(query ? `/markets?${query}` : '/markets')
            break
          }
          case 'RUN_SIMULATION': {
            const scenario = String(payload.scenario ?? '')
            navigate(scenario ? `/simulator?scenario=${encodeURIComponent(scenario)}` : '/simulator')
            break
          }
          case 'SEARCH_MEMORY': {
            const query = String(payload.query ?? '')
            navigate(query ? `/memory?q=${encodeURIComponent(query)}` : '/memory')
            break
          }
          case 'HIGHLIGHT_COMPANY': {
            const company = String(payload.company ?? '').toUpperCase()
            const symbol = COMPANY_TO_SYMBOL[company]
            update({ selectedCompany: company || null, highlightedEntities: company ? [company] : [], openPanel: 'market', activeLayer: 'company-exposure' })
            const location = symbol ? resolveCompanyLocation(symbol) : null
            if (location) intelligenceBus.emit('STOCK_SELECTED', { ticker: symbol, company: location })
            if (symbol) navigate(`/markets?symbol=${symbol}`)
            break
          }
        }
      }),
    [navigate, selectEntity, update, reset, setCamera],
  )

  return null
}

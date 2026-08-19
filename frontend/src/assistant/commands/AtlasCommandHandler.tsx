import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorldStore } from '../../stores/WorldStore'
import { commandBus } from './commandBus'
import type { AtlasCommand } from './commandTypes'
import { globeFocusBus } from './globeFocusBus'
import { visualizationBus } from './visualizationBus'
import { createIntent, type VisualizationIntent } from '../../features/globe/visualizationIntent'

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

  const driveVisual = (intent: VisualizationIntent) => {
    visualizationBus.drive(intent)
    if (intent.focus?.[0]) selectEntity(intent.focus[0])
    navigate('/dashboard')
  }

  useEffect(
    () =>
      commandBus.subscribe((command: AtlasCommand) => {
        const payload = command.payload

        switch (command.type) {
          case 'FOCUS_COUNTRY': {
            const country = String(payload.country ?? '')
            if (!country) break
            selectEntity(country)
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
            globeFocusBus.reset()
            driveVisual(createIntent({ mode: 'globe', scale: 'global', camera: 'pullback', transition: 'particle_reform' }))
            break
          case 'SHOW_ROUTE': {
            const to = String(payload.to ?? '')
            const from = String(payload.from ?? '')
            if (to) {
              selectEntity(to)
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
            break
          case 'VISUALIZE': {
            const intent = payload.intent as VisualizationIntent | undefined
            if (intent) driveVisual(intent)
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
            const sector = String(payload.sector ?? '').toLowerCase()
            const target = COMPANY_TO_SYMBOL[symbol] ?? SECTOR_TO_SYMBOL[sector]
            navigate(target ? `/markets?symbol=${target}` : '/markets')
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
            if (symbol) navigate(`/markets?symbol=${symbol}`)
            break
          }
        }
      }),
    [navigate, selectEntity],
  )

  return null
}

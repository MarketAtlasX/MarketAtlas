import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorldStore } from '../../stores/WorldStore'
import { commandBus } from './commandBus'
import type { AtlasCommand } from './commandTypes'
import { globeFocusBus } from './globeFocusBus'

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
            navigate('/dashboard')
            break
          }
          case 'ZOOM_GLOBE':
            selectEntity(null)
            globeFocusBus.reset()
            navigate('/dashboard')
            break
          case 'SHOW_ROUTE': {
            const to = String(payload.to ?? '')
            if (to) {
              selectEntity(to)
              globeFocusBus.fly({ entity: to })
            }
            navigate('/dashboard')
            break
          }
          case 'SHOW_RISK':
            selectEntity(null)
            navigate('/dashboard?globe=risk')
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

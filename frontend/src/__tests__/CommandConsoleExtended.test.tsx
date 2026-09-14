import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WorldProvider } from '../stores/WorldStore'
import { AtlasProvider } from '../stores/AtlasStore'
import CommandConsole from '../features/world-command/CommandConsole'

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { value: () => {}, writable: true, configurable: true })
})

describe('CommandConsole', () => {
  it('renders all console tabs with honest labels', () => {
    render(
      <MemoryRouter>
        <WorldProvider>
          <CommandConsole />
        </WorldProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('EVENTS \u00b7 SIMULATED')).toBeInTheDocument()
    expect(screen.getByText('PROPAGATION')).toBeInTheDocument()
    expect(screen.getByText('AI ANALYSIS')).toBeInTheDocument()
    expect(screen.getByText('WORLD MEMORY')).toBeInTheDocument()
    expect(screen.getByText('ATLAS')).toBeInTheDocument()
  })

  it('shows the command input when initialized on the command tab', () => {
    const { container } = render(
      <MemoryRouter>
        <WorldProvider>
          <AtlasProvider>
            <CommandConsole initialTab="command" />
          </AtlasProvider>
        </WorldProvider>
      </MemoryRouter>,
    )
    expect(container.querySelector('input')).not.toBeNull()
  })

  it('switches to events tab when events tab is selected', () => {
    render(
      <MemoryRouter>
        <WorldProvider>
          <CommandConsole initialTab="events" />
        </WorldProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('EVENTS \u00b7 SIMULATED')).toBeInTheDocument()
  })
})

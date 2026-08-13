import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WorldProvider } from '../stores/WorldStore'
import CommandConsole from '../features/world-command/CommandConsole'

describe('CommandConsole', () => {
  it('renders all console tabs', () => {
    render(
      <MemoryRouter>
        <WorldProvider>
          <CommandConsole />
        </WorldProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('LIVE EVENTS')).toBeInTheDocument()
    expect(screen.getByText('PROPAGATION')).toBeInTheDocument()
    expect(screen.getByText('AI ANALYSIS')).toBeInTheDocument()
    expect(screen.getByText('WORLD MEMORY')).toBeInTheDocument()
    expect(screen.getByText('COMMAND')).toBeInTheDocument()
  })

  it('shows the command input when initialised on the command tab', () => {
    const { container } = render(
      <MemoryRouter>
        <WorldProvider>
          <CommandConsole initialTab="command" />
        </WorldProvider>
      </MemoryRouter>,
    )
    expect(container.querySelector('input')).not.toBeNull()
  })
})

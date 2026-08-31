import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WorldProvider } from '../stores/WorldStore'
import NavigationRail from '../features/world-command/NavigationRail'

describe('NavigationRail', () => {
  it('renders the main navigation destinations', () => {
    render(
      <MemoryRouter>
        <WorldProvider>
          <NavigationRail />
        </WorldProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('WORLD')).toBeInTheDocument()
    expect(screen.getByText('MARKETS')).toBeInTheDocument()
    expect(screen.getByText('GRAPH')).toBeInTheDocument()
    expect(screen.getByText('SIMULATOR')).toBeInTheDocument()
    expect(screen.getByText('MEMORY')).toBeInTheDocument()
    expect(screen.getByText('AGENTS')).toBeInTheDocument()
  })

  it('renders a reset button', () => {
    render(
      <MemoryRouter>
        <WorldProvider>
          <NavigationRail />
        </WorldProvider>
      </MemoryRouter>,
    )
    expect(screen.getByTitle('Reset globe')).toBeInTheDocument()
  })

  it('renders the atlas navigation destination', () => {
    render(
      <MemoryRouter>
        <WorldProvider>
          <NavigationRail />
        </WorldProvider>
      </MemoryRouter>,
    )
    expect(screen.getByTitle('ATLAS')).toBeInTheDocument()
  })
})

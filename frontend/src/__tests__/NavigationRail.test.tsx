import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { withProviders } from './harness'
import NavigationRail from '../features/world-command/NavigationRail'

describe('NavigationRail', () => {
  it('renders the main navigation destinations', () => {
    render(withProviders(<NavigationRail />))
    expect(screen.getByText('WORLD')).toBeInTheDocument()
    expect(screen.getByText('MARKETS')).toBeInTheDocument()
    expect(screen.getByText('GRAPH')).toBeInTheDocument()
    expect(screen.getByText('SIMULATOR')).toBeInTheDocument()
    expect(screen.getByText('MEMORY')).toBeInTheDocument()
    expect(screen.getByText('AGENTS')).toBeInTheDocument()
  })

  it('renders a reset button', () => {
    render(withProviders(<NavigationRail />))
    expect(screen.getByTitle('Reset globe')).toBeInTheDocument()
  })

  it('renders the atlas navigation destination', () => {
    render(withProviders(<NavigationRail />))
    expect(screen.getByTitle('ATLAS')).toBeInTheDocument()
  })
})

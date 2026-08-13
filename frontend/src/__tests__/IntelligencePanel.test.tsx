import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WorldProvider } from '../stores/WorldStore'
import IntelligencePanel from '../features/world-command/IntelligencePanel'

describe('IntelligencePanel', () => {
  it('renders the geopolitical risk panel', () => {
    render(
      <MemoryRouter>
        <WorldProvider>
          <IntelligencePanel />
        </WorldProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('Geopolitical Risk')).toBeInTheDocument()
    expect(screen.getByText('Active Events')).toBeInTheDocument()
    expect(screen.getByText('Market Impact')).toBeInTheDocument()
    expect(screen.getByText('VIEW REASONING GRAPH')).toBeInTheDocument()
  })
})

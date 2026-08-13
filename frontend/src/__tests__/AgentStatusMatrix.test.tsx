import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WorldProvider } from '../stores/WorldStore'
import AgentStatusMatrix from '../features/world-command/AgentStatusMatrix'

describe('AgentStatusMatrix', () => {
  it('renders the AI network header with consensus', () => {
    render(
      <WorldProvider>
        <AgentStatusMatrix />
      </WorldProvider>,
    )
    expect(screen.getByText('AI Network')).toBeInTheDocument()
    expect(screen.getByText(/Consensus/)).toBeInTheDocument()
  })

  it('renders agent rows', () => {
    render(
      <WorldProvider>
        <AgentStatusMatrix />
      </WorldProvider>,
    )
    expect(screen.getAllByText(/ACTIVE|ANALYZING\.\.\.|NEW INSIGHT/).length).toBeGreaterThan(0)
  })
})

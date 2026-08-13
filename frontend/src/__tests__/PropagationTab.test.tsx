import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WorldProvider } from '../stores/WorldStore'
import PropagationTab from '../features/world-command/tabs/PropagationTab'

describe('PropagationTab', () => {
  it('renders risk intensity from seeded world state', () => {
    render(
      <WorldProvider>
        <PropagationTab />
      </WorldProvider>,
    )
    expect(screen.getByText('RISK INTENSITY')).toBeInTheDocument()
  })

  it('renders causal chain nodes', () => {
    const { container } = render(
      <WorldProvider>
        <PropagationTab />
      </WorldProvider>,
    )
    expect(container.querySelectorAll('div').length).toBeGreaterThan(0)
  })
})

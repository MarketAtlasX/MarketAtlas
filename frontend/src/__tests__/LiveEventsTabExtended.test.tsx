import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WorldProvider } from '../stores/WorldStore'
import LiveEventsTab from '../features/world-command/tabs/LiveEventsTab'

describe('LiveEventsTab', () => {
  it('shows the current data mode status', () => {
    render(
      <MemoryRouter>
        <WorldProvider>
          <LiveEventsTab />
        </WorldProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText(/SIMULATED/)).toBeInTheDocument()
    expect(screen.getByText(/NO LIVE UPDATE/)).toBeInTheDocument()
  })
})

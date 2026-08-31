import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WorldProvider } from '../stores/WorldStore'
import LiveEventsTab from '../features/world-command/tabs/LiveEventsTab'

describe('LiveEventsTab', () => {
  it('renders the live events heading', () => {
    render(
      <MemoryRouter>
        <WorldProvider>
          <LiveEventsTab />
        </WorldProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText(/LIVE EVENTS/)).toBeInTheDocument()
  })
})

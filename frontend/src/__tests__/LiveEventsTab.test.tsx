import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WorldProvider } from '../stores/WorldStore'
import LiveEventsTab from '../features/world-command/tabs/LiveEventsTab'

describe('LiveEventsTab', () => {
  it('renders seeded live event cards', () => {
    render(
      <WorldProvider>
        <LiveEventsTab />
      </WorldProvider>,
    )
    expect(screen.getAllByText(/SEV \d+\/10/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/CONFLICT|SANCTION|TRADE|DIPLOMATIC|MILITARY|ECONOMIC|NATURAL|MARKET/).length).toBeGreaterThan(0)
  })
})

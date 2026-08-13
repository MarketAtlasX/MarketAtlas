import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WorldProvider, useWorldStore } from '../stores/WorldStore'

function Probe() {
  const { state } = useWorldStore()
  return (
    <div>
      <span data-testid="events">{state.events.length}</span>
      <span data-testid="signals">{state.signals.length}</span>
      <span data-testid="risk">{state.worldRisk.score}</span>
      <span data-testid="agents">{state.agents.length}</span>
    </div>
  )
}

describe('WorldProvider', () => {
  it('seeds a live world state', () => {
    render(
      <WorldProvider>
        <Probe />
      </WorldProvider>,
    )
    expect(Number(screen.getByTestId('events').textContent)).toBeGreaterThan(0)
    expect(Number(screen.getByTestId('signals').textContent)).toBeGreaterThan(0)
    expect(Number(screen.getByTestId('risk').textContent)).toBeGreaterThan(0)
    expect(Number(screen.getByTestId('agents').textContent)).toBeGreaterThan(0)
  })

  it('throws when consumed outside the provider', () => {
    expect(() => render(<Probe />)).toThrow('useWorldStore must be used within WorldProvider')
  })
})

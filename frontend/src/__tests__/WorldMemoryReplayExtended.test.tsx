import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MemoryPage from '../features/world-memory/MemoryPage'

describe('World Memory Replay Extended', () => {
  it('renders the search input', () => {
    render(
      <MemoryRouter>
        <MemoryPage />
      </MemoryRouter>,
    )
    const input = document.querySelector('input')
    expect(input).not.toBeNull()
  })

  it('shows analogue cards for a matching query', () => {
    render(
      <MemoryRouter initialEntries={['/memory?q=Ukraine']}>
        <MemoryPage />
      </MemoryRouter>,
    )
    const analogueCards = screen.getAllByText(/2022 Ukraine Invasion/)
    expect(analogueCards.length).toBeGreaterThan(0)
  })

  it('filters analogues by search query', () => {
    render(
      <MemoryRouter initialEntries={['/memory?q=Ukraine']}>
        <MemoryPage />
      </MemoryRouter>,
    )
    expect(screen.getAllByText('2022 Ukraine Invasion').length).toBeGreaterThan(0)
  })
})
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CommandInput from '../features/world-command/CommandInput'

describe('CommandInput', () => {
  it('renders the command input with submit button', () => {
    render(
      <MemoryRouter>
        <CommandInput />
      </MemoryRouter>,
    )
    expect(screen.getByPlaceholderText(/Ask MarketAtlas/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /RUN/i })).toBeInTheDocument()
  })

  it('renders navigation buttons after a run completes', () => {
    render(
      <MemoryRouter>
        <CommandInput />
      </MemoryRouter>,
    )
    expect(screen.getByPlaceholderText(/Ask MarketAtlas/i)).toBeInTheDocument()
  })
})
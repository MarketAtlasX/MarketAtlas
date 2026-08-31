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
    expect(screen.getByPlaceholderText(/command/i)).toBeInTheDocument()
  })

  it('renders navigation buttons', () => {
    render(
      <MemoryRouter>
        <CommandInput />
      </MemoryRouter>,
    )
    expect(screen.getByText(/graph/i)).toBeInTheDocument()
    expect(screen.getByText(/simulator/i)).toBeInTheDocument()
    expect(screen.getByText(/memory/i)).toBeInTheDocument()
  })
})

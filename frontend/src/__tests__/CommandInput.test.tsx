import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CommandInput from '../features/world-command/CommandInput'

describe('CommandInput', () => {
  it('renders the command prompt and run button', () => {
    render(
      <MemoryRouter>
        <CommandInput />
      </MemoryRouter>,
    )
    expect(screen.getByPlaceholderText('Ask MarketAtlas...')).toBeInTheDocument()
    expect(screen.getByText('RUN')).toBeInTheDocument()
  })
})

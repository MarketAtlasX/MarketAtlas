import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MemoryPage from '../features/world-memory/MemoryPage'

describe('MemoryPage', () => {
  it('renders the world memory heading', () => {
    render(
      <MemoryRouter>
        <MemoryPage />
      </MemoryRouter>,
    )
    expect(screen.getByText(/WORLD MEMORY/)).toBeInTheDocument()
  })

  it('lists a curated historical analogue after clearing search', () => {
    const { container } = render(
      <MemoryRouter>
        <MemoryPage />
      </MemoryRouter>,
    )
    const input = container.querySelector('input')
    fireEvent.change(input as HTMLInputElement, { target: { value: '' } })
    expect(screen.getByText('2022 Ukraine Invasion')).toBeInTheDocument()
  })
})

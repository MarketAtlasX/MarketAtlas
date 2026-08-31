import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WorldProvider } from '../stores/WorldStore'
import TopStatusBar from '../features/world-command/TopStatusBar'

describe('Replay on Globe — Top Bar', () => {
  it('shows back button when replaying from memory', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard?tab=events&replay=%7B%22mode%22%3A%22risk%22%7D']}>
        <WorldProvider>
          <TopStatusBar />
        </WorldProvider>
      </MemoryRouter>,
    )
    expect(screen.getByTitle('Go back')).toBeInTheDocument()
  })

  it('shows dashboard home button even with replay params', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard?replay=%7B%22mode%22%3A%22risk%22%7D']}>
        <WorldProvider>
          <TopStatusBar />
        </WorldProvider>
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Go to dashboard' })).toBeInTheDocument()
  })
})

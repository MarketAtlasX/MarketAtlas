import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WorldProvider } from '../stores/WorldStore'
import TopStatusBar from '../features/world-command/TopStatusBar'

describe('TopStatusBar', () => {
  it('renders the brand and live indicator', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <WorldProvider>
          <TopStatusBar />
        </WorldProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('Geopolitical Intelligence')).toBeInTheDocument()
    expect(screen.getByText('LIVE')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go to dashboard' })).toBeInTheDocument()
  })

  it('renders the world risk score and level', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <WorldProvider>
          <TopStatusBar />
        </WorldProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('World Risk')).toBeInTheDocument()
    expect(screen.getByText(/^(LOW|ELEVATED|HIGH|CRITICAL)$/)).toBeInTheDocument()
  })

  it('renders a back button outside the dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/graph']}>
        <WorldProvider>
          <TopStatusBar />
        </WorldProvider>
      </MemoryRouter>,
    )
    expect(screen.getByTitle('Go back')).toBeInTheDocument()
  })
})

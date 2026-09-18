import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { withProviders } from './harness'
import TopStatusBar from '../features/world-command/TopStatusBar'

describe('TopStatusBar', () => {
  it('renders the brand and truthful data-mode indicator', () => {
    render(withProviders(<TopStatusBar />, ['/dashboard']))
    expect(screen.getByText('Geopolitical Intelligence')).toBeInTheDocument()
    expect(screen.getByText('SIMULATED')).toBeInTheDocument()
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go to dashboard' })).toBeInTheDocument()
  })

  it('renders the world risk score and level', () => {
    render(withProviders(<TopStatusBar />, ['/dashboard']))
    expect(screen.getByText('World Risk')).toBeInTheDocument()
    expect(screen.getByText(/^(LOW|ELEVATED|HIGH|CRITICAL)$/)).toBeInTheDocument()
  })

  it('renders a back button outside the dashboard', () => {
    render(withProviders(<TopStatusBar />, ['/graph']))
    expect(screen.getByTitle('Go back')).toBeInTheDocument()
  })
})

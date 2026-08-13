import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WorldProvider } from '../stores/WorldStore'
import TopStatusBar from '../features/world-command/TopStatusBar'

describe('TopStatusBar', () => {
  it('renders the brand and live indicator', () => {
    render(
      <WorldProvider>
        <TopStatusBar />
      </WorldProvider>,
    )
    expect(screen.getByText('Geopolitical Intelligence')).toBeInTheDocument()
    expect(screen.getByText('LIVE')).toBeInTheDocument()
  })

  it('renders the world risk score and level', () => {
    render(
      <WorldProvider>
        <TopStatusBar />
      </WorldProvider>,
    )
    expect(screen.getByText('World Risk')).toBeInTheDocument()
    expect(screen.getByText(/^(LOW|ELEVATED|HIGH|CRITICAL)$/)).toBeInTheDocument()
  })
})

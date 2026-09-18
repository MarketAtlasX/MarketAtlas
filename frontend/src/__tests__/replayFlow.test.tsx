import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { withProviders } from './harness'
import AppLayout from '../components/AppLayout'

describe('Replay Flow Integration', () => {
  it('dashboard shows the top bar with home button', () => {
    render(
      withProviders(
        <AppLayout>
          <div>Content</div>
        </AppLayout>,
        ['/dashboard'],
      ),
    )
    const brand = screen.getByTitle('Go to dashboard')
    expect(brand.textContent).toContain('MARKET')
    expect(brand.textContent).toContain('ATLAS')
  })

  it('home button navigates to dashboard', () => {
    render(
      withProviders(
        <AppLayout>
          <div>Content</div>
        </AppLayout>,
        ['/dashboard'],
      ),
    )
    expect(screen.getByRole('button', { name: 'Go to dashboard' })).toBeInTheDocument()
  })

  it('back button appears on non-dashboard pages', () => {
    render(
      withProviders(
        <AppLayout>
          <div>Content</div>
        </AppLayout>,
        ['/memory'],
      ),
    )
    expect(screen.getByTitle('Go back')).toBeInTheDocument()
  })
})

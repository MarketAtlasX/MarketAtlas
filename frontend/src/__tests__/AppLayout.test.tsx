import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { withProviders } from './harness'
import AppLayout from '../components/AppLayout'

describe('AppLayout', () => {
  it('renders children inside the layout', () => {
    render(
      withProviders(
        <AppLayout>
          <div data-testid="child">Hello</div>
        </AppLayout>,
      ),
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('renders the top status bar', () => {
    render(
      withProviders(
        <AppLayout>
          <div>Content</div>
        </AppLayout>,
      ),
    )
    const brand = screen.getByTitle('Go to dashboard')
    expect(brand.textContent).toContain('MARKET')
    expect(brand.textContent).toContain('ATLAS')
  })
})

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { withProviders } from './harness'
import AppLayout from '../components/AppLayout'

function TestPage() {
  return <div data-testid="test-page">Test</div>
}

describe('AppLayout routing integration', () => {
  it('wraps children and renders top bar across all routes', () => {
    render(
      withProviders(
        <AppLayout>
          <TestPage />
        </AppLayout>,
        ['/markets'],
      ),
    )
    expect(screen.getByTestId('test-page')).toBeInTheDocument()
    const brand = screen.getByTitle('Go to dashboard')
    expect(brand.textContent).toContain('MARKET')
    expect(brand.textContent).toContain('ATLAS')
  })

  it('renders back button on memory route', () => {
    render(
      withProviders(
        <AppLayout>
          <TestPage />
        </AppLayout>,
        ['/memory'],
      ),
    )
    expect(screen.getByTitle('Go back')).toBeInTheDocument()
  })

  it('does not render back button on dashboard route', () => {
    render(
      withProviders(
        <AppLayout>
          <TestPage />
        </AppLayout>,
        ['/dashboard'],
      ),
    )
    expect(screen.queryByTitle('Go back')).not.toBeInTheDocument()
  })
})

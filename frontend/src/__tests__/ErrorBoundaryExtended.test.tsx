import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import ErrorBoundary from '../components/ErrorBoundary'

function Broken({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('test error')
  }
  return <div>Works</div>
}

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <Broken shouldThrow={false} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Works')).toBeInTheDocument()
  })

  it('catches errors and renders fallback', () => {
    render(
      <ErrorBoundary>
        <Broken shouldThrow={true} />
      </ErrorBoundary>,
    )
    expect(document.body.textContent).toContain('Error')
  })
})

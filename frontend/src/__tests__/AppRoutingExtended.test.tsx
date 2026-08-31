import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { WorldProvider } from '../stores/WorldStore'
import AppLayout from '../components/AppLayout'

function TestPage() {
  return <div data-testid="test-page">Test</div>
}

describe('AppLayout routing integration', () => {
  it('wraps children and renders top bar across all routes', () => {
    render(
      <MemoryRouter initialEntries={['/markets']}>
        <WorldProvider>
          <AppLayout>
            <TestPage />
          </AppLayout>
        </WorldProvider>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('test-page')).toBeInTheDocument()
    expect(screen.getByText('MARKETATLAS')).toBeInTheDocument()
  })

  it('renders back button on memory route', () => {
    render(
      <MemoryRouter initialEntries={['/memory']}>
        <WorldProvider>
          <AppLayout>
            <TestPage />
          </AppLayout>
        </WorldProvider>
      </MemoryRouter>,
    )
    expect(screen.getByTitle('Go back')).toBeInTheDocument()
  })

  it('does not render back button on dashboard route', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <WorldProvider>
          <AppLayout>
            <TestPage />
          </AppLayout>
        </WorldProvider>
      </MemoryRouter>,
    )
    expect(screen.queryByTitle('Go back')).not.toBeInTheDocument()
  })
})

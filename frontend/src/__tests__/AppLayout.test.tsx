import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WorldProvider } from '../stores/WorldStore'
import AppLayout from '../components/AppLayout'

describe('AppLayout', () => {
  it('renders children inside the layout', () => {
    render(
      <MemoryRouter>
        <WorldProvider>
          <AppLayout>
            <div data-testid="child">Hello</div>
          </AppLayout>
        </WorldProvider>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('renders the top status bar', () => {
    render(
      <MemoryRouter>
        <WorldProvider>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </WorldProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('MARKETATLAS')).toBeInTheDocument()
  })
})

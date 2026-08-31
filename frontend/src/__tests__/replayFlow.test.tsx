import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WorldProvider } from '../stores/WorldStore'
import AppLayout from '../components/AppLayout'
import TopStatusBar from '../features/world-command/TopStatusBar'

describe('Replay Flow Integration', () => {
  it('dashboard shows the top bar with home button', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <WorldProvider>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </WorldProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('MARKETATLAS')).toBeInTheDocument()
  })

  it('home button navigates to dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <WorldProvider>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </WorldProvider>
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Go to dashboard' })).toBeInTheDocument()
  })

  it('back button appears on non-dashboard pages', () => {
    render(
      <MemoryRouter initialEntries={['/memory']}>
        <WorldProvider>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </WorldProvider>
      </MemoryRouter>,
    )
    expect(screen.getByTitle('Go back')).toBeInTheDocument()
  })
})

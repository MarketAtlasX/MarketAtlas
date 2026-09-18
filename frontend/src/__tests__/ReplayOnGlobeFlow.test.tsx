import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { withProviders } from './harness'
import TopStatusBar from '../features/world-command/TopStatusBar'

describe('Replay on Globe — Top Bar', () => {
  it('shows the home button on the dashboard even with replay params', () => {
    render(
      withProviders(<TopStatusBar />, ['/dashboard?tab=events&replay=%7B%22mode%22%3A%22risk%22%7D']),
    )
    expect(screen.getByRole('button', { name: 'Go to dashboard' })).toBeInTheDocument()
    expect(screen.queryByTitle('Go back')).not.toBeInTheDocument()
  })

  it('shows dashboard home button even with replay params', () => {
    render(withProviders(<TopStatusBar />, ['/dashboard?replay=%7B%22mode%22%3A%22risk%22%7D']))
    expect(screen.getByRole('button', { name: 'Go to dashboard' })).toBeInTheDocument()
  })
})

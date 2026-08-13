import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WorldProvider } from '../stores/WorldStore'
import AIAnalysisTab from '../features/world-command/tabs/AIAnalysisTab'

describe('AIAnalysisTab', () => {
  it('renders agent insight cards', () => {
    render(
      <WorldProvider>
        <AIAnalysisTab />
      </WorldProvider>,
    )
    expect(screen.getAllByText(/agent insight/).length).toBeGreaterThan(0)
  })
})

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusDot from '../components/ui/StatusDot'

describe('StatusDot', () => {
  it('renders all tone variants', () => {
    const tones = ['positive', 'warning', 'critical', 'accent', 'neutral'] as const
    tones.forEach(tone => {
      const { unmount } = render(<StatusDot tone={tone} />)
      unmount()
    })
  })

  it('renders with pulse enabled by default', () => {
    render(<StatusDot tone="positive" />)
    const dot = screen.getByRole('status')
    expect(dot).toBeInTheDocument()
  })

  it('renders without pulse when pulse is false', () => {
    render(<StatusDot tone="accent" pulse={false} />)
    const dot = screen.getByRole('status')
    expect(dot).toBeInTheDocument()
  })
})

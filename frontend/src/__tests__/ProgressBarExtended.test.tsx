import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProgressBar from '../components/ui/ProgressBar'

describe('ProgressBar', () => {
  it('renders with a value', () => {
    render(<ProgressBar value={75} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders with shimmer enabled', () => {
    render(<ProgressBar value={50} shimmer />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('applies custom color class', () => {
    const { container } = render(<ProgressBar value={60} color="var(--accent)" />)
    const bar = container.querySelector('[style*="background"]')
    expect(bar).toBeInTheDocument()
  })
})

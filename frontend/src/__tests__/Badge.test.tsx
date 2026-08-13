import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Badge from '../components/ui/Badge'

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>WARN</Badge>)
    expect(screen.getByText('WARN')).toBeInTheDocument()
  })

  it('applies the requested tone class', () => {
    const { container } = render(<Badge tone="critical">CRIT</Badge>)
    expect(container.firstElementChild?.className).toContain('text-[var(--critical)]')
  })

  it('defaults to neutral tone', () => {
    const { container } = render(<Badge>NEUTRAL</Badge>)
    expect(container.firstElementChild?.className).toContain('text-[var(--text-mid)]')
  })
})

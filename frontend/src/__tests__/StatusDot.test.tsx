import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import StatusDot from '../components/ui/StatusDot'

describe('StatusDot', () => {
  it('renders a pulsing dot with the requested tone color', () => {
    const { container } = render(<StatusDot tone="critical" />)
    const dots = container.querySelectorAll('span')
    expect(dots.length).toBe(3)
    const inner = dots[dots.length - 1]
    expect(inner.getAttribute('style')).toContain('var(--critical)')
  })

  it('renders without a pulse ring when pulse is disabled', () => {
    const { container } = render(<StatusDot pulse={false} />)
    expect(container.querySelectorAll('span').length).toBe(2)
  })
})

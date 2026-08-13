import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import Sparkline from '../components/ui/Sparkline'

describe('Sparkline', () => {
  it('renders an svg path for two or more points', () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} />)
    expect(container.querySelector('svg')).not.toBeNull()
    expect(container.querySelector('path')).not.toBeNull()
  })

  it('renders a placeholder when there is a single point', () => {
    const { container } = render(<Sparkline data={[1]} />)
    expect(container.querySelector('svg')).toBeNull()
  })

  it('renders an area path when fill is set', () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} fill="#38e8ff" />)
    expect(container.querySelectorAll('path').length).toBeGreaterThanOrEqual(2)
  })
})

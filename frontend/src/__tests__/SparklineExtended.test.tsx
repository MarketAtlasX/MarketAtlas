import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Sparkline from '../components/ui/Sparkline'

describe('Sparkline', () => {
  it('renders an SVG sparkline with data points', () => {
    const data = [1, 3, 2, 5, 4, 6, 8, 7]
    render(<Sparkline data={data} />)
    const svg = screen.getByRole('img')
    expect(svg).toBeInTheDocument()
  })

  it('renders with empty data gracefully', () => {
    render(<Sparkline data={[]} />)
    const svg = screen.getByRole('img')
    expect(svg).toBeInTheDocument()
  })
})

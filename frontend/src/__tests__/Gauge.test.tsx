import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Gauge from '../components/ui/Gauge'

describe('Gauge', () => {
  it('renders the value and label', () => {
    render(<Gauge value={85} label="Risk" />)
    expect(screen.getByText('85')).toBeInTheDocument()
    expect(screen.getByText('Risk')).toBeInTheDocument()
  })

  it('renders the sub label when provided', () => {
    render(<Gauge value={50} sub="/100" />)
    expect(screen.getByText('/100')).toBeInTheDocument()
  })

  it('renders an svg ring with a fill stroke', () => {
    const { container } = render(<Gauge value={50} max={100} />)
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBeGreaterThanOrEqual(2)
    expect(circles[1].getAttribute('stroke')).toBeTruthy()
  })
})

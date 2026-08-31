import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Gauge from '../components/ui/Gauge'

describe('Gauge', () => {
  it('renders with a value', () => {
    render(<Gauge value={75} max={100} />)
    expect(screen.getByText('75')).toBeInTheDocument()
  })

  it('renders with a label', () => {
    render(<Gauge value={50} label="Risk" />)
    expect(screen.getByText('Risk')).toBeInTheDocument()
  })

  it('renders at zero', () => {
    render(<Gauge value={0} max={100} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})

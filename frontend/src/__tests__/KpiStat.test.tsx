import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import KpiStat from '../components/ui/KpiStat'

describe('KpiStat', () => {
  it('renders label and value', () => {
    render(<KpiStat label="Current Price" value="$128.50" delta={2.4} />)
    expect(screen.getByText('Current Price')).toBeInTheDocument()
    expect(screen.getByText('$128.50')).toBeInTheDocument()
    expect(screen.getByText('+2.40%')).toBeInTheDocument()
  })

  it('renders negative delta correctly', () => {
    render(<KpiStat label="Drawdown" value="-$4.20" delta={-3.15} />)
    expect(screen.getByText('-3.15%')).toBeInTheDocument()
  })
})

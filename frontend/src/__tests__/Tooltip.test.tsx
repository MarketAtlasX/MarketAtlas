import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import Tooltip from '../components/ui/Tooltip'

describe('Tooltip', () => {
  it('shows tooltip content on hover', () => {
    render(
      <Tooltip content="Geopolitical risk metric">
        <span>Hover Me</span>
      </Tooltip>
    )
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    fireEvent.mouseEnter(screen.getByText('Hover Me').parentElement!)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Geopolitical risk metric')
    fireEvent.mouseLeave(screen.getByText('Hover Me').parentElement!)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})

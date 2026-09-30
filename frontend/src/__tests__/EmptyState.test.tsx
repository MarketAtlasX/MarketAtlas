import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import EmptyState from '../components/ui/EmptyState'

describe('EmptyState', () => {
  it('renders title, description and calls action button', () => {
    const handleClick = vi.fn()
    render(
      <EmptyState
        title="No Live Events Found"
        description="Try relaxing search filters or refreshing feed."
        action={{ label: 'Reset Filter', onClick: handleClick }}
      />
    )
    expect(screen.getByText('No Live Events Found')).toBeInTheDocument()
    expect(screen.getByText('Try relaxing search filters or refreshing feed.')).toBeInTheDocument()
    const btn = screen.getByText('Reset Filter')
    fireEvent.click(btn)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})

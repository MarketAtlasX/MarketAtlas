import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import PillBadge from '../components/ui/PillBadge'

describe('PillBadge', () => {
  it('renders badge with correct text and variant class', () => {
    render(<PillBadge label="HIGH RISK" variant="red" />)
    const badge = screen.getByText('HIGH RISK')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('text-[var(--bear)]')
  })
})

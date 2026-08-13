import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MemoryTab from '../features/world-command/tabs/MemoryTab'

describe('MemoryTab', () => {
  it('lists the full analogue archive when search is cleared', () => {
    const { container } = render(<MemoryTab />)
    const input = container.querySelector('input')
    fireEvent.change(input as HTMLInputElement, { target: { value: '' } })
    expect(screen.getByText('2022 Ukraine Invasion')).toBeInTheDocument()
    expect(screen.getByText('2020 Supply Shock')).toBeInTheDocument()
    expect(screen.getByText('2011 Fukushima')).toBeInTheDocument()
  })

  it('filters the archive by query', () => {
    const { container } = render(<MemoryTab />)
    const input = container.querySelector('input')
    fireEvent.change(input as HTMLInputElement, { target: { value: 'hormuz' } })
    expect(screen.getByText('2012 Hormuz Crisis')).toBeInTheDocument()
    expect(screen.queryByText('2022 Ukraine Invasion')).toBeNull()
  })
})

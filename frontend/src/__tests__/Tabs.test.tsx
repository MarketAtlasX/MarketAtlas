import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Tabs from '../components/ui/Tabs'

const items = [
  { key: 'a', label: 'Alpha' },
  { key: 'b', label: 'Beta' },
]

describe('Tabs', () => {
  it('renders all tab labels', () => {
    render(<Tabs items={items} value="a" onChange={() => {}} />)
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('calls onChange with the clicked tab key', () => {
    const onChange = vi.fn()
    render(<Tabs items={items} value="a" onChange={onChange} />)
    fireEvent.click(screen.getAllByText('Beta')[0])
    expect(onChange).toHaveBeenCalledWith('b')
  })
})

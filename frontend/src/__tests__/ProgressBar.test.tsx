import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import ProgressBar from '../components/ui/ProgressBar'

describe('ProgressBar', () => {
  it('fills to the percentage of value over max', () => {
    const { container } = render(<ProgressBar value={50} max={100} />)
    const fill = container.querySelector('div.h-full')
    expect(fill).not.toBeNull()
    expect(fill?.getAttribute('style')).toContain('width: 50%')
  })

  it('clamps values above the max', () => {
    const { container } = render(<ProgressBar value={150} max={100} />)
    const fill = container.querySelector('div.h-full')
    expect(fill?.getAttribute('style')).toContain('width: 100%')
  })
})

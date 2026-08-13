import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Panel from '../components/ui/Panel'

describe('Panel', () => {
  it('renders title and children', () => {
    render(
      <Panel title="Intel">
        <p>content</p>
      </Panel>,
    )
    expect(screen.getByText('Intel')).toBeInTheDocument()
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('renders the right slot when provided', () => {
    render(
      <Panel right={<span>RIGHT</span>}>
        body
      </Panel>,
    )
    expect(screen.getByText('RIGHT')).toBeInTheDocument()
  })

  it('applies glow and corner decorations', () => {
    const { container } = render(
      <Panel glow="critical" corners>
        body
      </Panel>,
    )
    const section = container.querySelector('section')
    expect(section?.className).toContain('glow-critical')
    expect(section?.className).toContain('hud-corners')
  })
})

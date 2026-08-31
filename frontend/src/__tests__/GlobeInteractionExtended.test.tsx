import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WorldProvider } from '../stores/WorldStore'
import HolographicGlobe from '../features/globe/HolographicGlobe'
import { createIntent } from '../features/globe/visualizationIntent'

describe('Globe interaction tests', () => {
  it('renders the globe container', () => {
    render(
      <MemoryRouter>
        <WorldProvider>
          <div style={{ width: 800, height: 600 }}>
            <HolographicGlobe mode="world" />
          </div>
        </WorldProvider>
      </MemoryRouter>,
    )
    expect(document.querySelector('.cinematic-globe')).toBeInTheDocument()
  })

  it('accepts an intentOverride prop', () => {
    const intent = createIntent({ mode: 'risk', scale: 'regional' })
    render(
      <MemoryRouter>
        <WorldProvider>
          <div style={{ width: 800, height: 600 }}>
            <HolographicGlobe mode="world" intentOverride={intent} />
          </div>
        </WorldProvider>
      </MemoryRouter>,
    )
    expect(document.querySelector('.cinematic-globe')).toBeInTheDocument()
  })

  it('renders globe caption', () => {
    render(
      <MemoryRouter>
        <WorldProvider>
          <div style={{ width: 800, height: 600 }}>
            <HolographicGlobe mode="risk" />
          </div>
        </WorldProvider>
      </MemoryRouter>,
    )
    const caption = document.querySelector('.cinematic-globe__caption')
    expect(caption).toBeInTheDocument()
  })
})

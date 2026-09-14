import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WorldProvider } from '../stores/WorldStore'
import { AtlasProvider } from '../stores/AtlasStore'
import HolographicGlobe from '../features/globe/HolographicGlobe'
import { createIntent } from '../features/globe/visualizationIntent'

const renderGlobe = (extra: React.ReactNode) =>
  render(
    <MemoryRouter>
      <WorldProvider>
        <AtlasProvider>
          <div style={{ width: 800, height: 600 }}>{extra}</div>
        </AtlasProvider>
      </WorldProvider>
    </MemoryRouter>,
  )

describe('Globe interaction tests', () => {
  it('renders the globe container', () => {
    renderGlobe(<HolographicGlobe mode="world" />)
    expect(document.querySelector('.cinematic-globe')).toBeInTheDocument()
  })

  it('accepts an intentOverride prop', () => {
    const intent = createIntent({ mode: 'risk', scale: 'regional' })
    renderGlobe(<HolographicGlobe mode="world" intentOverride={intent} />)
    expect(document.querySelector('.cinematic-globe')).toBeInTheDocument()
  })

  it('renders globe caption', () => {
    renderGlobe(<HolographicGlobe mode="risk" />)
    const caption = document.querySelector('.cinematic-globe__caption')
    expect(caption).toBeInTheDocument()
  })
})
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WorldProvider, useWorldStore } from '../stores/WorldStore'

function SelectProbe() {
  const { state, selectEntity } = useWorldStore()
  return (
    <div>
      <span data-testid="selected">{state.selectedEntity ?? 'none'}</span>
      <button onClick={() => selectEntity('Taiwan')}>Select Taiwan</button>
      <button onClick={() => selectEntity(null)}>Clear</button>
    </div>
  )
}

describe('WorldStore', () => {
  it('starts with no selected entity', () => {
    render(
      <WorldProvider>
        <SelectProbe />
      </WorldProvider>,
    )
    expect(screen.getByTestId('selected')).toHaveTextContent('none')
  })

  it('selects an entity when selectEntity is called', () => {
    render(
      <WorldProvider>
        <SelectProbe />
      </WorldProvider>,
    )
    fireEvent.click(screen.getByText('Select Taiwan'))
    expect(screen.getByTestId('selected')).toHaveTextContent('Taiwan')
  })

  it('clears the selected entity when selectEntity(null) is called', () => {
    render(
      <WorldProvider>
        <SelectProbe />
      </WorldProvider>,
    )
    fireEvent.click(screen.getByText('Select Taiwan'))
    expect(screen.getByTestId('selected')).toHaveTextContent('Taiwan')
    fireEvent.click(screen.getByText('Clear'))
    expect(screen.getByTestId('selected')).toHaveTextContent('none')
  })
})

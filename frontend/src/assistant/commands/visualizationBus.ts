import type { VisualizationIntent } from '../../features/globe/visualizationIntent'

type Listener = (intent: VisualizationIntent) => void

class VisualizationBus {
  private listeners = new Set<Listener>()

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  drive(intent: VisualizationIntent): void {
    this.listeners.forEach(listener => listener(intent))
  }

  clear(): void {
    this.listeners.clear()
  }
}

export const visualizationBus = new VisualizationBus()
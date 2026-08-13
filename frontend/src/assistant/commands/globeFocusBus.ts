export interface GlobeFocusTarget {
  entity: string
  lat?: number
  lng?: number
}

type Listener = (target: GlobeFocusTarget | null) => void

class GlobeFocusBus {
  private listeners = new Set<Listener>()

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  fly(target: GlobeFocusTarget): void {
    this.listeners.forEach(listener => listener(target))
  }

  reset(): void {
    this.listeners.forEach(listener => listener(null))
  }
}

export const globeFocusBus = new GlobeFocusBus()

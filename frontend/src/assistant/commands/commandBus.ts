import type { AtlasCommand } from './commandTypes'

type CommandListener = (command: AtlasCommand) => void

class AtlasCommandBus {
  private listeners = new Set<CommandListener>()

  subscribe(listener: CommandListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  emit(command: AtlasCommand): void {
    this.listeners.forEach(listener => {
      listener(command)
    })
  }

  clear(): void {
    this.listeners.clear()
  }
}

export const commandBus = new AtlasCommandBus()

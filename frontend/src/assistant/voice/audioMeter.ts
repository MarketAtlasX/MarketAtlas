export class AudioMeter {
  private ctx?: AudioContext
  private analyser?: AnalyserNode
  private raf = 0
  private running = false
  private onLevel: (level: number) => void

  constructor(onLevel: (level: number) => void) {
    this.onLevel = onLevel
  }

  start(stream: MediaStream): void {
    if (this.running) return
    try {
      this.ctx = new AudioContext()
      this.analyser = this.ctx.createAnalyser()
      this.analyser.fftSize = 512
      this.ctx.createMediaStreamSource(stream).connect(this.analyser)
      this.running = true
      this.tick()
    } catch {
      this.running = false
    }
  }

  private tick = (): void => {
    if (!this.running || !this.analyser) return
    const data = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteFrequencyData(data)
    let sum = 0
    for (let i = 0; i < data.length; i++) {
      sum += data[i]
    }
    this.onLevel(Math.min(1, sum / data.length / 255 / 2))
    this.raf = requestAnimationFrame(this.tick)
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.raf)
    this.ctx?.close().catch(() => {})
    this.ctx = undefined
    this.analyser = undefined
  }
}

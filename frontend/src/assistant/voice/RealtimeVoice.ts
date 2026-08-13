export type RealtimeEventHandler = (event: Record<string, unknown>) => void

export class RealtimeVoice {
  private pc?: RTCPeerConnection
  private dataChannel?: RTCDataChannel
  private micStream?: MediaStream
  private audioElement?: HTMLAudioElement

  get microphone(): MediaStream | undefined {
    return this.micStream
  }

  async connect(onEvent: RealtimeEventHandler): Promise<void> {
    const tokenResponse = await fetch('/api/assistant/realtime-token')
    if (!tokenResponse.ok) {
      throw new Error('Unable to obtain realtime token')
    }

    const tokenData = (await tokenResponse.json()) as { value?: string }
    const token = tokenData.value
    if (!token) {
      throw new Error('Realtime token response missing value')
    }

    this.pc = new RTCPeerConnection()

    this.audioElement = document.createElement('audio')
    this.audioElement.autoplay = true

    this.pc.ontrack = event => {
      if (this.audioElement && event.streams[0]) {
        this.audioElement.srcObject = event.streams[0]
      }
    }

    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const track = this.micStream.getAudioTracks()[0]
    this.pc.addTrack(track, this.micStream)

    this.dataChannel = this.pc.createDataChannel('oai-events')
    this.dataChannel.addEventListener('message', event => {
      try {
        const data = JSON.parse(event.data as string) as Record<string, unknown>
        onEvent(data)
      } catch {
        // ignore malformed frames
      }
    })

    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)

    const response = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/sdp',
      },
      body: offer.sdp,
    })

    if (!response.ok) {
      throw new Error('Realtime connection failed')
    }

    const sdp = await response.text()
    await this.pc.setRemoteDescription({ type: 'answer', sdp })
  }

  disconnect(): void {
    this.dataChannel?.close()
    this.pc?.close()
    this.micStream?.getTracks().forEach(t => t.stop())
    this.dataChannel = undefined
    this.pc = undefined
    this.micStream = undefined
    this.audioElement = undefined
  }
}

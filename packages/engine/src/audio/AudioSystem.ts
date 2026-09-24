export class AudioSystem {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private volume = 0.3

  async unlock(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext()
      this.master = this.context.createGain()
      this.master.gain.value = this.volume
      this.master.connect(this.context.destination)
    }
    if (this.context.state === 'suspended') {
      await this.context.resume()
    }
  }

  start(): void {
    const now = this.currentTime()
    this.tone(392, now, 0.12, 'sine', 0.12)
    this.tone(523.25, now + 0.1, 0.18, 'sine', 0.14)
  }

  catch(combo: number): void {
    const now = this.currentTime()
    const root = 440 * Math.pow(1.05946, Math.min(combo, 10))
    this.tone(root, now, 0.09, 'triangle', 0.2, root * 1.18)
    this.tone(root * 1.5, now + 0.06, 0.12, 'sine', 0.15, root * 1.75)
  }

  miss(): void {
    const now = this.currentTime()
    this.tone(170, now, 0.16, 'sine', 0.12, 105)
  }

  pause(): void {
    const now = this.currentTime()
    this.tone(360, now, 0.12, 'sine', 0.1, 270)
  }

  finish(score: number): void {
    const now = this.currentTime()
    const notes = score >= 20 ? [392, 494, 587, 784] : [330, 392, 494]
    notes.forEach((frequency, index) => {
      this.tone(frequency, now + index * 0.13, 0.28, 'triangle', 0.13)
    })
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value))
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.02)
    }
  }

  destroy(): void {
    void this.context?.close()
    this.context = null
    this.master = null
  }

  private currentTime(): number {
    return this.context?.currentTime ?? 0
  }

  private tone(
    frequency: number,
    start: number,
    duration: number,
    type: OscillatorType,
    gain: number,
    endFrequency = frequency,
  ): void {
    if (!this.context || !this.master) {
      return
    }
    const oscillator = this.context.createOscillator()
    const envelope = this.context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, start)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration)
    envelope.gain.setValueAtTime(0.0001, start)
    envelope.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.025, duration / 3))
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    oscillator.connect(envelope)
    envelope.connect(this.master)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.02)
  }
}

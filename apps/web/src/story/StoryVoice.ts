import type { StoryVoiceRole } from './storyData'

export interface StoryVoiceOptions {
  recordedClips?: Readonly<Record<string, string>>
  muted?: boolean
}

export class StoryVoice {
  private readonly speech: SpeechSynthesis | null
  private readonly recordedClips: Readonly<Record<string, string>>
  private readonly audio: HTMLAudioElement | null
  private muted: boolean
  private lastText = ''
  private lastRole: StoryVoiceRole = 'narrator'
  private lastClipKey: string | null = null

  constructor(options: StoryVoiceOptions = {}) {
    this.speech = typeof window !== 'undefined' ? window.speechSynthesis ?? null : null
    this.recordedClips = options.recordedClips ?? {}
    this.audio = typeof Audio !== 'undefined' ? new Audio() : null
    this.muted = options.muted ?? false
  }

  async unlock(): Promise<void> {
    this.speech?.resume()
    if (this.speech) {
      this.speech.getVoices()
    }
  }

  speak(text: string, role: StoryVoiceRole = 'narrator', clipKey?: string): void {
    this.lastText = text
    this.lastRole = role
    this.lastClipKey = clipKey ?? null
    this.stop()
    if (this.muted) {
      return
    }
    const clipUrl = clipKey ? this.recordedClips[clipKey] : undefined
    if (clipUrl && this.audio) {
      this.audio.src = clipUrl
      this.audio.currentTime = 0
      this.audio.volume = 0.95
      void this.audio.play().catch(() => this.speakWithDevice(text, role))
      return
    }
    this.speakWithDevice(text, role)
  }

  replay(): void {
    if (this.lastText) {
      this.speak(this.lastText, this.lastRole, this.lastClipKey ?? undefined)
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (muted) {
      this.stop()
    }
  }

  get isMuted(): boolean {
    return this.muted
  }

  stop(): void {
    this.speech?.cancel()
    if (this.audio) {
      this.audio.pause()
      this.audio.currentTime = 0
    }
  }

  destroy(): void {
    this.stop()
  }

  private speakWithDevice(text: string, role: StoryVoiceRole): void {
    if (!this.speech) {
      return
    }
    const utterance = new SpeechSynthesisUtterance(text)
    const voice = chooseVoice(this.speech.getVoices(), role)
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang
    } else {
      utterance.lang = 'en-US'
    }
    utterance.rate = role === 'narrator' ? 0.88 : 0.92
    utterance.pitch = role === 'bird' ? 1.3 : role === 'marmot' ? 1.12 : role === 'squirrel' ? 1.04 : 1
    utterance.volume = 0.95
    this.speech.speak(utterance)
  }
}

export function chooseVoice(
  voices: readonly SpeechSynthesisVoice[],
  role: StoryVoiceRole,
): SpeechSynthesisVoice | null {
  const english = voices.filter(voice => voice.lang.toLowerCase().startsWith('en'))
  const preferredNames: Record<StoryVoiceRole, readonly string[]> = {
    narrator: ['Samantha', 'Google US English', 'Microsoft Aria'],
    marmot: ['Samantha', 'Google UK English Female'],
    squirrel: ['Karen', 'Google UK English Female'],
    bird: ['Google US English', 'Microsoft Zira'],
  }
  for (const name of preferredNames[role]) {
    const match = english.find(voice => voice.name.includes(name))
    if (match) {
      return match
    }
  }
  return english[0] ?? voices[0] ?? null
}

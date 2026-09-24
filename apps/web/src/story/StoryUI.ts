import type { StoryVoiceRole } from './storyData'

export type StoryScreen = 'start' | 'story' | 'complete' | 'parent'
export type StoryDifficulty = 1 | 2 | 3

export interface StorySettings {
  muted: boolean
  captions: boolean
  difficulty: StoryDifficulty
  sessionMinutes: number
}

export interface StoryUICallbacks {
  onStart: () => void
  onReplay: () => void
  onParentGate: () => void
  onBack: () => void
  onSettingsChange: (settings: StorySettings) => void
  onReset: () => void
}

export class StoryUI {
  private readonly startScreen = this.required<HTMLElement>('#story-start-screen')
  private readonly storyScreen = this.required<HTMLElement>('#story-screen')
  private readonly completeScreen = this.required<HTMLElement>('#story-complete-screen')
  private readonly parentScreen = this.required<HTMLElement>('#story-parent-screen')
  private readonly prompt = this.required<HTMLElement>('#story-prompt')
  private readonly hint = this.required<HTMLElement>('#story-hint')
  private readonly chapterLabel = this.required<HTMLElement>('#story-chapter-label')
  private readonly progressFill = this.required<HTMLElement>('#story-progress-fill')
  private readonly progressText = this.required<HTMLElement>('#story-progress-text')
  private readonly feedback = this.required<HTMLElement>('#story-feedback')
  private readonly caption = this.required<HTMLElement>('#story-caption')
  private readonly voiceLabel = this.required<HTMLElement>('#story-voice-label')
  private readonly parentGate = this.required<HTMLButtonElement>('#story-parent-gate')
  private readonly muteInput = this.required<HTMLInputElement>('#story-mute')
  private readonly captionsInput = this.required<HTMLInputElement>('#story-captions')
  private readonly difficultyInput = this.required<HTMLSelectElement>('#story-difficulty')
  private readonly sessionInput = this.required<HTMLSelectElement>('#story-session')
  private settings: StorySettings = { muted: false, captions: true, difficulty: 1, sessionMinutes: 0 }
  private currentVoiceRole: StoryVoiceRole = 'narrator'
  private gateTimer: number | null = null

  constructor(private readonly callbacks: StoryUICallbacks) {
    this.required<HTMLButtonElement>('#story-start-button').addEventListener('click', callbacks.onStart)
    this.required<HTMLButtonElement>('#story-replay-button').addEventListener('click', callbacks.onReplay)
    this.required<HTMLButtonElement>('#story-again-button').addEventListener('click', callbacks.onStart)
    this.required<HTMLAnchorElement>('#story-back').addEventListener('click', callbacks.onBack)
    this.parentGate.addEventListener('pointerdown', () => this.beginParentGate())
    this.parentGate.addEventListener('pointerup', () => this.cancelParentGate())
    this.parentGate.addEventListener('pointerleave', () => this.cancelParentGate())
    this.parentGate.addEventListener('keydown', event => {
      if (event.code === 'Enter' || event.code === 'Space') {
        event.preventDefault()
        this.callbacks.onParentGate()
      }
    })
    this.required<HTMLButtonElement>('#story-parent-close').addEventListener('click', () => this.show('story'))
    this.required<HTMLButtonElement>('#story-reset-button').addEventListener('click', callbacks.onReset)
    this.muteInput.addEventListener('change', () => this.emitSettings())
    this.captionsInput.addEventListener('change', () => this.emitSettings())
    this.difficultyInput.addEventListener('change', () => this.emitSettings())
    this.sessionInput.addEventListener('change', () => this.emitSettings())
  }

  show(screen: StoryScreen): void {
    this.startScreen.classList.toggle('is-visible', screen === 'start')
    this.storyScreen.classList.toggle('is-visible', screen === 'story')
    this.completeScreen.classList.toggle('is-visible', screen === 'complete')
    this.parentScreen.classList.toggle('is-visible', screen === 'parent')
  }

  setPrompt(text: string, hint: string, voiceRole: StoryVoiceRole): void {
    this.currentVoiceRole = voiceRole
    this.prompt.textContent = text
    this.hint.textContent = hint
    this.caption.textContent = text
    this.updateVoiceLabel()
  }

  setProgress(chapterIndex: number, taskIndex: number, totalTasks: number): void {
    const currentTask = chapterIndex * 3 + taskIndex + 1
    this.chapterLabel.textContent = `Story ${chapterIndex + 1} · Task ${taskIndex + 1}`
    this.progressText.textContent = `${currentTask} of ${totalTasks}`
    this.progressFill.style.width = `${Math.min(100, (currentTask / totalTasks) * 100)}%`
  }

  setCaptions(visible: boolean): void {
    this.caption.classList.toggle('is-hidden', !visible)
    this.captionsInput.checked = visible
    this.settings.captions = visible
  }

  setMuted(muted: boolean): void {
    this.muteInput.checked = muted
    this.settings.muted = muted
    this.updateVoiceLabel()
  }

  getSettings(): StorySettings {
    return { ...this.settings }
  }

  showTryAgain(hint: string): void {
    this.hint.textContent = hint
    this.feedback.textContent = 'Let us try that one again.'
    this.feedback.classList.remove('is-hidden', 'is-success')
    this.feedback.classList.add('is-try')
  }

  showSuccess(message: string): void {
    this.hint.textContent = message
    this.feedback.textContent = message
    this.feedback.classList.remove('is-hidden', 'is-try')
    this.feedback.classList.add('is-success')
  }

  showComplete(): void {
    this.feedback.textContent = 'You helped the whole meadow!'
    this.feedback.classList.remove('is-hidden', 'is-try')
    this.feedback.classList.add('is-success')
  }

  setParentGateLocked(locked: boolean): void {
    this.parentGate.classList.toggle('is-held', locked)
  }

  destroy(): void {
    this.cancelParentGate()
  }

  private updateVoiceLabel(): void {
    if (this.settings.muted) {
      this.voiceLabel.textContent = 'Voice muted'
    } else {
      this.voiceLabel.textContent = this.currentVoiceRole === 'narrator' ? 'Story voice' : `${this.currentVoiceRole} voice`
    }
  }

  private emitSettings(): void {
    const difficulty = Number(this.difficultyInput.value)
    const sessionMinutes = Number(this.sessionInput.value)
    this.settings = {
      muted: this.muteInput.checked,
      captions: this.captionsInput.checked,
      difficulty: difficulty === 2 || difficulty === 3 ? difficulty : 1,
      sessionMinutes: Number.isFinite(sessionMinutes) ? sessionMinutes : 0,
    }
    this.callbacks.onSettingsChange(this.settings)
  }

  private beginParentGate(): void {
    this.cancelParentGate()
    this.setParentGateLocked(true)
    this.gateTimer = window.setTimeout(() => {
      this.gateTimer = null
      this.setParentGateLocked(false)
      this.callbacks.onParentGate()
    }, 1200)
  }

  private cancelParentGate(): void {
    if (this.gateTimer !== null) {
      window.clearTimeout(this.gateTimer)
      this.gateTimer = null
    }
    this.setParentGateLocked(false)
  }

  private required<T extends Element>(selector: string): T {
    const element = document.querySelector<T>(selector)
    if (!element) {
      throw new Error(`Missing story interface element ${selector}`)
    }
    return element
  }
}

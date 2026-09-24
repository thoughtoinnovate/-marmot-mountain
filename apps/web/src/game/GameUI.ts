export type GameScreen = 'loading' | 'ready' | 'playing' | 'paused' | 'ended'

export interface GameUICallbacks {
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onRestart: () => void
  onSoundChange: (muted: boolean) => void
}

export class GameUI {
  private readonly loading = this.required<HTMLElement>('#loading-screen')
  private readonly welcome = this.required<HTMLElement>('#welcome-screen')
  private readonly pause = this.required<HTMLElement>('#pause-screen')
  private readonly results = this.required<HTMLElement>('#results-screen')
  private readonly hud = this.required<HTMLElement>('#hud')
  private readonly scoreValue = this.required<HTMLElement>('#score-value')
  private readonly timeValue = this.required<HTMLElement>('#time-value')
  private readonly comboValue = this.required<HTMLElement>('#combo-value')
  private readonly comboPanel = this.required<HTMLElement>('#combo-panel')
  private readonly finalScore = this.required<HTMLElement>('#final-score')
  private readonly finalCaught = this.required<HTMLElement>('#final-caught')
  private readonly bestScore = this.required<HTMLElement>('#best-score')
  private readonly newBest = this.required<HTMLElement>('#new-best')
  private readonly feedback = this.required<HTMLElement>('#feedback-layer')
  private readonly soundButton = this.required<HTMLButtonElement>('#sound-button')
  private readonly pauseButton = this.required<HTMLButtonElement>('#pause-button')
  private muted = false
  private comboTimer = 0

  constructor(private readonly callbacks: GameUICallbacks) {
    this.required<HTMLButtonElement>('#start-button').addEventListener('click', callbacks.onStart)
    this.pauseButton.addEventListener('click', callbacks.onPause)
    this.required<HTMLButtonElement>('#resume-button').addEventListener('click', callbacks.onResume)
    this.required<HTMLButtonElement>('#restart-button').addEventListener('click', callbacks.onRestart)
    this.required<HTMLButtonElement>('#play-again-button').addEventListener('click', callbacks.onRestart)
    this.soundButton.addEventListener('click', () => {
      this.muted = !this.muted
      this.updateSoundButton()
      this.callbacks.onSoundChange(this.muted)
    })
  }

  show(screen: GameScreen): void {
    this.loading.classList.toggle('is-visible', screen === 'loading')
    this.welcome.classList.toggle('is-visible', screen === 'ready')
    this.pause.classList.toggle('is-visible', screen === 'paused')
    this.results.classList.toggle('is-visible', screen === 'ended')
    this.hud.classList.toggle('is-visible', screen === 'playing' || screen === 'paused')
    this.pauseButton.disabled = screen !== 'playing'
  }

  updateHud(score: number, secondsRemaining: number, combo: number, deltaTime: number): void {
    this.scoreValue.textContent = String(score)
    const wholeSeconds = Math.max(0, Math.ceil(secondsRemaining))
    this.timeValue.textContent = `0:${String(wholeSeconds).padStart(2, '0')}`
    this.timeValue.closest('.hud-stat')?.classList.toggle('is-low', wholeSeconds <= 10)
    this.comboValue.textContent = `×${Math.max(1, combo)}`
    this.comboPanel.classList.toggle('is-active', combo > 1)
    this.comboPanel.style.setProperty('--combo-life', `${Math.max(0, this.comboTimer)}s`)
    if (this.comboTimer > 0) {
      this.comboTimer = Math.max(0, this.comboTimer - deltaTime)
    }
  }

  activateCombo(seconds: number): void {
    this.comboTimer = seconds
  }

  showCatch(clientX: number, clientY: number, points: number, combo: number): void {
    const marker = document.createElement('div')
    marker.className = 'catch-marker'
    marker.style.left = `${clientX}px`
    marker.style.top = `${clientY}px`
    const pointsElement = document.createElement('strong')
    pointsElement.textContent = `+${points}`
    marker.append(pointsElement)
    if (combo > 1) {
      const comboElement = document.createElement('span')
      comboElement.textContent = `${combo} streak`
      marker.append(comboElement)
    }
    this.feedback.append(marker)
    marker.addEventListener('animationend', () => marker.remove(), { once: true })
  }

  showResults(score: number, caught: number, best: number, isNewBest: boolean): void {
    this.finalScore.textContent = String(score)
    this.finalCaught.textContent = String(caught)
    this.bestScore.textContent = String(best)
    this.newBest.classList.toggle('is-visible', isNewBest)
  }

  setReadyValues(best: number): void {
    this.required<HTMLElement>('#welcome-best').textContent = String(best)
  }

  fail(message: string): void {
    this.loading.classList.add('is-visible')
    this.required<HTMLElement>('#loading-title').textContent = 'Unable to start'
    this.required<HTMLElement>('#loading-message').textContent = message
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    this.updateSoundButton()
  }

  private updateSoundButton(): void {
    this.soundButton.classList.toggle('is-muted', this.muted)
    this.soundButton.setAttribute('aria-label', this.muted ? 'Turn sound on' : 'Turn sound off')
    this.soundButton.textContent = this.muted ? 'Sound off' : 'Sound on'
  }

  private required<T extends Element>(selector: string): T {
    const element = document.querySelector<T>(selector)
    if (!element) {
      throw new Error(`Missing interface element ${selector}`)
    }
    return element
  }
}

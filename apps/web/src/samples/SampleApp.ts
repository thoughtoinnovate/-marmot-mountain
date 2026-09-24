import { Engine, type PointerPosition } from '@marmot/engine'
import { SampleScene } from './OrbitScene'
import './sample.css'

export class SampleApp {
  private readonly engine: Engine
  private readonly scene: SampleScene
  private readonly pointerUnsubscribe: () => void
  private readonly startButton: HTMLButtonElement
  private readonly scoreElement: HTMLElement
  private readonly timeElement: HTMLElement
  private readonly comboElement: HTMLElement
  private readonly startScreen: HTMLElement
  private readonly endScreen: HTMLElement
  private readonly finalScore: HTMLElement

  constructor() {
    mountSampleShell()
    const canvas = document.querySelector<HTMLCanvasElement>('#sample-canvas')
    if (!canvas) {
      throw new Error('Sample canvas is missing')
    }
    this.engine = new Engine(canvas, {
      backgroundColor: [0.06, 0.11, 0.16],
      renderer: {
        lightColor: [1.1, 0.98, 0.9],
        shadowSize: 1024,
      },
    })
    this.startButton = this.required<HTMLButtonElement>('#sample-start')
    this.scoreElement = this.required<HTMLElement>('#sample-score')
    this.timeElement = this.required<HTMLElement>('#sample-time')
    this.comboElement = this.required<HTMLElement>('#sample-combo')
    this.startScreen = this.required<HTMLElement>('#sample-start-screen')
    this.endScreen = this.required<HTMLElement>('#sample-end-screen')
    this.finalScore = this.required<HTMLElement>('#sample-final-score')
    this.scene = new SampleScene(
      this.engine,
      (stats) => this.updateStats(stats.score, stats.timeRemaining, stats.combo),
      (score) => this.finish(score),
    )
    this.startButton.addEventListener('click', () => this.start())
    this.required<HTMLButtonElement>('#sample-again').addEventListener('click', () => this.start())
    this.required<HTMLAnchorElement>('#sample-editor').addEventListener('click', () => {
      window.location.hash = 'editor'
    })
    this.required<HTMLAnchorElement>('#sample-home').addEventListener('click', () => {
      window.location.hash = ''
    })
    this.pointerUnsubscribe = this.engine.input.onPointerDown((pointer) => this.pick(pointer))
    this.engine.start(this.scene)
  }

  destroy(): void {
    this.pointerUnsubscribe()
    this.engine.destroy()
    this.scene.destroy()
  }

  private start(): void {
    this.startScreen.classList.remove('is-visible')
    this.endScreen.classList.remove('is-visible')
    this.scene.start()
    void this.engine.audio.unlock().then(() => this.engine.audio.start())
  }

  private pick(pointer: PointerPosition): void {
    const target = this.scene.pick(
      pointer.canvasX,
      pointer.canvasY,
      this.engine.canvas.clientWidth,
      this.engine.canvas.clientHeight,
    )
    if (target && this.scene.catchTarget(target)) {
      this.engine.audio.catch(1)
      this.flash('+orbit')
    }
  }

  private updateStats(score: number, timeRemaining: number, combo: number): void {
    this.scoreElement.textContent = String(score)
    this.timeElement.textContent = `0:${String(Math.ceil(timeRemaining)).padStart(2, '0')}`
    this.comboElement.textContent = `×${Math.max(1, combo)}`
  }

  private finish(score: number): void {
    this.finalScore.textContent = String(score)
    this.endScreen.classList.add('is-visible')
    this.engine.audio.finish(score)
  }

  private flash(message: string): void {
    const marker = document.createElement('span')
    marker.className = 'sample-hit-marker'
    marker.textContent = message
    this.required<HTMLElement>('#sample-feedback').append(marker)
    marker.addEventListener('animationend', () => marker.remove(), { once: true })
  }

  private required<T extends Element>(selector: string): T {
    const element = document.querySelector<T>(selector)
    if (!element) {
      throw new Error(`Missing sample element ${selector}`)
    }
    return element
  }
}

function mountSampleShell(): void {
  const app = document.querySelector<HTMLElement>('#app')
  if (!app) {
    throw new Error('Application root is missing')
  }
  app.innerHTML = `
    <div class="sample-shell">
      <canvas id="sample-canvas" aria-label="Orbit Relay sample game"></canvas>
      <header class="sample-header"><a id="sample-home" href="#">← Marmot Mountain</a><div><span>Engine sample 01</span><a id="sample-editor" href="#editor">Open studio</a></div></header>
      <div class="sample-hud"><div><span>Score</span><strong id="sample-score">0</strong></div><div><span>Time</span><strong id="sample-time">0:30</strong></div><div><span>Streak</span><strong id="sample-combo">×1</strong></div></div>
      <div id="sample-feedback" class="sample-feedback" aria-live="polite"></div>
      <section id="sample-start-screen" class="sample-screen is-visible"><div class="sample-card"><span class="sample-kicker">Second game · same engine</span><h1>Orbit<br /><em>Relay</em></h1><p>Tap the floating satellites before the clock runs out. This scene is built with Marmot Engine, not the marmot game.</p><button id="sample-start" class="sample-button" type="button">Start orbiting <span>→</span></button></div></section>
      <section id="sample-end-screen" class="sample-screen"><div class="sample-card"><span class="sample-kicker">Signal complete</span><h2>Nice orbit.</h2><p>Final score <strong id="sample-final-score">0</strong></p><button id="sample-again" class="sample-button" type="button">Run it again <span>↗</span></button></div></section>
    </div>`
}

import { Engine, type PointerPosition } from '@marmot/engine'
import { StoryScene } from './StoryScene'
import { StoryUI, type StorySettings } from './StoryUI'
import { StoryVoice } from './StoryVoice'
import { TOTAL_STORY_TASKS } from './storyData'
import './story.css'

const RECORDED_STORY_CLIPS: Readonly<Record<string, string>> = {}

export class StoryApp {
  private readonly engine: Engine
  private readonly voice: StoryVoice
  private readonly ui: StoryUI
  private readonly scene: StoryScene
  private readonly pointerUnsubscribe: () => void
  private sessionTimer: number | null = null
  private sessionStartedAt = 0
  private sessionMinutes = 0

  constructor() {
    mountStoryShell()
    const canvas = document.querySelector<HTMLCanvasElement>('#story-canvas')
    if (!canvas) {
      throw new Error('Story canvas is missing')
    }
    this.voice = new StoryVoice({ recordedClips: RECORDED_STORY_CLIPS })
    this.ui = new StoryUI({
      onStart: () => void this.startStory(),
      onReplay: () => this.voice.replay(),
      onParentGate: () => {
        this.voice.stop()
        this.ui.show('parent')
      },
      onBack: () => {
        window.location.hash = ''
      },
      onSettingsChange: (settings) => this.applySettings(settings),
      onReset: () => void this.startStory(),
    })
    this.engine = new Engine(canvas, {
      backgroundColor: [0.48, 0.73, 0.84],
      renderer: {
        lightColor: [1.08, 1.03, 0.94],
        ambientColor: [0.2, 0.25, 0.3],
        skyColor: [0.3, 0.48, 0.65],
        shadowSize: 1024,
      },
    })
    this.scene = new StoryScene(this.engine, {
      onTask: (chapterIndex, taskIndex, task, chapter) => {
        this.ui.show('story')
        this.ui.setProgress(chapterIndex, taskIndex, TOTAL_STORY_TASKS)
        this.ui.setPrompt(task.prompt, task.hint, task.voiceRole)
        const storyLine = taskIndex === 0 ? `${chapter.title}. ${chapter.intro} ${task.voice}` : task.voice
        this.voice.speak(storyLine, task.voiceRole, task.id)
      },
      onVoice: (text, role, clipKey) => this.voice.speak(text, role, clipKey),
      onTryAgain: hint => this.ui.showTryAgain(hint),
      onSuccess: message => this.ui.showSuccess(message),
      onComplete: () => {
        this.stopSessionTimer()
        this.ui.showComplete()
        this.ui.show('complete')
        this.voice.speak('You helped the whole meadow. What a wonderful story!', 'narrator', 'story-complete')
      },
    })
    this.ui.setCaptions(true)
    this.ui.setMuted(false)
    this.ui.show('start')
    this.pointerUnsubscribe = this.engine.input.onPointerDown(pointer => this.handlePointer(pointer))
    this.engine.start(this.scene)
  }

  destroy(): void {
    this.stopSessionTimer()
    this.pointerUnsubscribe()
    this.ui.destroy()
    this.voice.destroy()
    this.engine.destroy()
    this.scene.destroy()
  }

  private async startStory(): Promise<void> {
    await this.voice.unlock()
    this.scene.start()
    this.ui.show('story')
    this.startSessionTimer()
  }

  private handlePointer(pointer: PointerPosition): void {
    const choiceId = this.scene.pick(
      pointer.canvasX,
      pointer.canvasY,
      this.engine.canvas.clientWidth,
      this.engine.canvas.clientHeight,
    )
    if (choiceId) {
      this.scene.choose(choiceId)
    }
  }

  private applySettings(settings: StorySettings): void {
    this.voice.setMuted(settings.muted)
    this.ui.setCaptions(settings.captions)
    this.scene.setDifficulty(settings.difficulty)
    this.sessionMinutes = settings.sessionMinutes
    if (this.sessionMinutes > 0 && this.sessionStartedAt > 0) {
      this.startSessionTimer()
    } else {
      this.stopSessionTimer()
    }
  }

  private startSessionTimer(): void {
    this.stopSessionTimer()
    this.sessionStartedAt = performance.now()
    if (this.sessionMinutes <= 0) {
      return
    }
    this.sessionTimer = window.setInterval(() => {
      const elapsedMinutes = (performance.now() - this.sessionStartedAt) / 60000
      if (elapsedMinutes >= this.sessionMinutes) {
        this.voice.stop()
        this.ui.show('parent')
        this.stopSessionTimer()
      }
    }, 1000)
  }

  private stopSessionTimer(): void {
    if (this.sessionTimer !== null) {
      window.clearInterval(this.sessionTimer)
      this.sessionTimer = null
    }
  }
}

function mountStoryShell(): void {
  const app = document.querySelector<HTMLElement>('#app')
  if (!app) {
    throw new Error('Application root is missing')
  }
  app.innerHTML = `
    <div class="story-shell">
      <canvas id="story-canvas" aria-label="Marmot Meadow Helpers story"></canvas>
      <header class="story-header"><a id="story-back" href="#">← Marmot Mountain</a><div><span class="story-header-label">Little Marmot Meadow</span><button id="story-parent-gate" type="button" aria-label="Hold for parent settings">Hold for parent</button></div></header>
      <div class="story-progress"><div><span id="story-chapter-label">Story 1 · Task 1</span><span id="story-progress-text">1 of 15</span></div><div class="story-progress-track"><span id="story-progress-fill"></span></div></div>
      <div id="story-screen" class="story-ui">
        <div id="story-caption" class="story-caption" aria-live="polite"><span id="story-voice-label">Story voice</span><p id="story-prompt"></p></div>
        <div class="story-guidance"><p id="story-hint"></p><button id="story-replay-button" type="button">Replay voice</button></div>
        <div id="story-feedback" class="story-feedback is-hidden" aria-live="polite"></div>
      </div>
      <section id="story-start-screen" class="story-overlay is-visible"><div class="story-card"><span class="story-kicker">A gentle story game</span><h1>Marmot<br /><em>Meadow Helpers</em></h1><p>Help the meadow friends with simple little tasks. Tap what the story voice points to—there are no scores and no wrong answers.</p><button id="story-start-button" class="story-primary-button" type="button">Begin the story <span>→</span></button><div class="story-start-note">English narration · Gentle guidance · Designed for little helpers</div></div></section>
      <section id="story-complete-screen" class="story-overlay"><div class="story-card"><span class="story-kicker">Story complete</span><h2>The meadow is happy!</h2><p>You helped every friend find what they needed.</p><button id="story-again-button" class="story-primary-button" type="button">Tell the story again <span>↗</span></button></div></section>
      <section id="story-parent-screen" class="story-overlay"><div class="story-parent-card"><div class="story-parent-heading"><div><span class="story-kicker">Parent corner</span><h2>Story settings</h2></div><button id="story-parent-close" type="button" aria-label="Close parent settings">Close</button></div><label class="story-setting"><span>Voice</span><input id="story-mute" type="checkbox" /><i></i></label><label class="story-setting"><span>Captions</span><input id="story-captions" type="checkbox" checked /><i></i></label><label class="story-select"><span>Difficulty</span><select id="story-difficulty"><option value="1">Little helper · 2 choices</option><option value="2">Explorer · 3 choices</option><option value="3">Big helper · 3 choices</option></select></label><label class="story-select"><span>Session limit</span><select id="story-session"><option value="0">No limit</option><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option></select></label><button id="story-reset-button" class="story-reset-button" type="button">Start story over</button><p class="story-parent-note">Settings are for a grown-up. No scores, ads, or child accounts are used.</p></div></section>
    </div>`
}

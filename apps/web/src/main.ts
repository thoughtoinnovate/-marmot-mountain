import { registerSW } from 'virtual:pwa-register'
import { Engine } from '@marmot/engine'
import { EditorApp } from './editor/EditorApp'
import { GameUI } from './game/GameUI'
import { MarmotGameScene } from './game/MarmotGameScene'
import { SampleApp } from './samples/SampleApp'
import { StoryApp } from './story/StoryApp'
import './style.css'

interface Runtime {
  destroy: () => void
}

type LaunchMode = 'game' | 'editor' | 'sample' | 'story'

const initialMode = getLaunchMode()
let runtime: Runtime | null = null
const currentMode = initialMode

window.addEventListener('hashchange', () => {
  if (getLaunchMode() !== currentMode) {
    window.location.reload()
  }
})

try {
  runtime = initialMode === 'editor'
    ? new EditorApp()
    : initialMode === 'sample'
      ? new SampleApp()
      : initialMode === 'story'
        ? new StoryApp()
        : startGame()
  registerSW({ immediate: true })
} catch (error) {
  const message = error instanceof Error ? error.message : 'The game could not be loaded.'
  showStartupError(message)
}

window.addEventListener('beforeunload', () => {
  runtime?.destroy()
})

function startGame(): Runtime {
  const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')
  if (!canvas) {
    throw new Error('Game canvas is missing')
  }
  let game: MarmotGameScene | null = null
  let engine: Engine | null = null
  const ui = new GameUI({
    onStart: () => game?.start(),
    onPause: () => game?.pause(),
    onResume: () => game?.resume(),
    onRestart: () => game?.start(),
    onSoundChange: (muted) => game?.toggleSound(muted),
  })
  engine = new Engine(canvas, {
    backgroundColor: [0.53, 0.77, 0.88],
    renderer: {
      lightColor: [1.08, 1.02, 0.9],
      shadowSize: 1536,
    },
  })
  game = new MarmotGameScene(engine, ui)
  engine.start(game)
  ui.show('ready')
  return {
    destroy: () => {
      game?.destroy()
      engine?.destroy()
    },
  }
}

function getLaunchMode(): LaunchMode {
  const route = window.location.hash.replace('#', '')
  return route === 'editor' || route === 'sample' || route === 'story' ? route : 'game'
}

function showStartupError(message: string): void {
  const app = document.querySelector<HTMLElement>('#app')
  if (!app) {
    return
  }
  app.innerHTML = `<div class="startup-error"><span>Marmot Mountain</span><h1>Unable to start</h1><p></p></div>`
  const paragraph = app.querySelector('p')
  if (paragraph) {
    paragraph.textContent = message
  }
}

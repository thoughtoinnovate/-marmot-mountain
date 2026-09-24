import { AudioSystem } from './audio/AudioSystem'
import { Input } from './input/Input'
import { Renderer, type RendererOptions } from './render/Renderer'
import type { Scene } from './scene/Scene'

export interface EngineOptions {
  backgroundColor?: readonly [number, number, number]
  maxDeltaTime?: number
  pixelRatioCap?: number
  renderer?: RendererOptions
}

export class Engine {
  readonly renderer: Renderer
  readonly input: Input
  readonly audio: AudioSystem
  scene: Scene | null = null
  private readonly maxDeltaTime: number
  private readonly pixelRatioCap: number
  private animationFrame = 0
  private previousTime = 0
  private running = false
  private resizeObserver: ResizeObserver | null = null

  private readonly frame = (timestamp: number): void => {
    if (!this.running || !this.scene) {
      return
    }
    const deltaTime = Math.min((timestamp - this.previousTime) / 1000, this.maxDeltaTime)
    this.previousTime = timestamp
    this.scene.camera.update(this.canvas.clientWidth / Math.max(this.canvas.clientHeight, 1))
    this.scene.update(deltaTime)
    this.renderer.render(this.scene)
    this.animationFrame = requestAnimationFrame(this.frame)
  }

  constructor(
    readonly canvas: HTMLCanvasElement,
    options: EngineOptions = {},
  ) {
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      depth: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    })
    if (!gl) {
      throw new Error('This game requires WebGL2 support')
    }
    this.renderer = new Renderer(gl, options.renderer)
    this.input = new Input(canvas)
    this.audio = new AudioSystem()
    this.maxDeltaTime = options.maxDeltaTime ?? 0.05
    this.pixelRatioCap = options.pixelRatioCap ?? 2
    this.resize()
  }

  start(scene: Scene): void {
    this.stop()
    this.scene = scene
    this.resize()
    this.running = true
    this.previousTime = performance.now()
    this.animationFrame = requestAnimationFrame(this.frame)
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.animationFrame)
  }

  destroy(): void {
    this.stop()
    this.resizeObserver?.disconnect()
    this.input.destroy()
    this.audio.destroy()
    this.renderer.destroy()
  }

  private resize(): void {
    const ratio = Math.min(window.devicePixelRatio || 1, this.pixelRatioCap)
    const width = Math.max(1, Math.round(this.canvas.clientWidth * ratio))
    const height = Math.max(1, Math.round(this.canvas.clientHeight * ratio))
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width
      this.canvas.height = height
      this.renderer.resize(width, height)
    }
    this.resizeObserver ??= new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(this.canvas)
  }
}

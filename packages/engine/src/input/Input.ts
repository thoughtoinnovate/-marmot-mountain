export interface PointerPosition {
  clientX: number
  clientY: number
  canvasX: number
  canvasY: number
  pointerId: number
}

export type PointerListener = (position: PointerPosition) => void
export type KeyListener = (event: KeyboardEvent) => void
export type Unsubscribe = () => void

export class Input {
  private nextPointerDown: PointerPosition | null = null
  private readonly keys = new Set<string>()
  private readonly pointerListeners = new Set<PointerListener>()
  private readonly keyListeners = new Set<KeyListener>()

  private readonly handlePointerDown = (event: PointerEvent): void => {
    event.preventDefault()
    const position = this.toCanvasPosition(event)
    this.nextPointerDown = position
    if (this.canvas.setPointerCapture) {
      this.canvas.setPointerCapture(event.pointerId)
    }
    for (const listener of this.pointerListeners) {
      listener(position)
    }
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.code)
    for (const listener of this.keyListeners) {
      listener(event)
    }
  }

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code)
  }

  private readonly handleBlur = (): void => {
    this.keys.clear()
    this.nextPointerDown = null
  }

  private readonly handleContextMenu = (event: MouseEvent): void => {
    event.preventDefault()
  }

  constructor(private readonly canvas: HTMLCanvasElement) {
    canvas.style.touchAction = 'none'
    canvas.addEventListener('pointerdown', this.handlePointerDown)
    canvas.addEventListener('contextmenu', this.handleContextMenu)
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
    window.addEventListener('blur', this.handleBlur)
  }

  consumePointerDown(): PointerPosition | null {
    const pointer = this.nextPointerDown
    this.nextPointerDown = null
    return pointer
  }

  onPointerDown(listener: PointerListener): Unsubscribe {
    this.pointerListeners.add(listener)
    return () => this.pointerListeners.delete(listener)
  }

  onKeyDown(listener: KeyListener): Unsubscribe {
    this.keyListeners.add(listener)
    return () => this.keyListeners.delete(listener)
  }

  isKeyDown(code: string): boolean {
    return this.keys.has(code)
  }

  destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown)
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu)
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    window.removeEventListener('blur', this.handleBlur)
    this.pointerListeners.clear()
    this.keyListeners.clear()
  }

  private toCanvasPosition(event: PointerEvent): PointerPosition {
    const bounds = this.canvas.getBoundingClientRect()
    return {
      clientX: event.clientX,
      clientY: event.clientY,
      canvasX: event.clientX - bounds.left,
      canvasY: event.clientY - bounds.top,
      pointerId: event.pointerId,
    }
  }
}

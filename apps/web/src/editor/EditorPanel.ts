import type {
  EditorPrimitive,
  EditorScene,
  EditorVector,
  TransformAxis,
  TransformProperty,
} from './EditorScene'

export interface EditorPanelCallbacks {
  onAdd: (kind: EditorPrimitive) => void
  onRemove: () => void
  onSave: () => void
  onLoad: () => void
  onExport: () => void
  onReset: () => void
  onTransform: (property: TransformProperty, axis: TransformAxis, value: number) => void
  onBack: () => void
  onSample: () => void
}

export class EditorPanel {
  private readonly root = this.required<HTMLElement>('#studio-panel')
  private readonly status = this.required<HTMLElement>('#editor-status')
  private readonly selectionName = this.required<HTMLElement>('#selection-name')
  private readonly fields = new Map<string, HTMLInputElement>()
  private selected = false

  constructor(
    private readonly scene: EditorScene,
    callbacks: EditorPanelCallbacks,
  ) {
    this.root.querySelectorAll<HTMLButtonElement>('[data-add]').forEach((button) => {
      button.addEventListener('click', () => {
        const kind = button.dataset.add
        if (kind === 'cube' || kind === 'orb' || kind === 'crystal') {
          callbacks.onAdd(kind)
        }
      })
    })
    this.required<HTMLButtonElement>('#editor-delete').addEventListener('click', callbacks.onRemove)
    this.required<HTMLButtonElement>('#editor-save').addEventListener('click', callbacks.onSave)
    this.required<HTMLButtonElement>('#editor-load').addEventListener('click', callbacks.onLoad)
    this.required<HTMLButtonElement>('#editor-export').addEventListener('click', callbacks.onExport)
    this.required<HTMLButtonElement>('#editor-reset').addEventListener('click', callbacks.onReset)
    this.required<HTMLAnchorElement>('#editor-back').addEventListener('click', callbacks.onBack)
    this.required<HTMLAnchorElement>('#editor-sample').addEventListener('click', callbacks.onSample)
    this.root.querySelectorAll<HTMLInputElement>('[data-transform]').forEach((input) => {
      this.fields.set(input.dataset.transform ?? '', input)
      input.addEventListener('input', () => {
        const value = Number(input.value)
        if (!Number.isFinite(value)) {
          return
        }
        const [property, axis] = (input.dataset.transform ?? '').split('.') as [TransformProperty, TransformAxis]
        callbacks.onTransform(property, axis, value)
      })
    })
    this.syncSelection()
  }

  syncSelection(): void {
    const node = this.scene.selectedNode
    this.selected = Boolean(node)
    this.selectionName.textContent = node?.name ?? 'No object selected'
    this.root.classList.toggle('has-selection', this.selected)
    for (const [key, input] of this.fields) {
      const [property, axis] = key.split('.') as [TransformProperty, TransformAxis]
      const value = node ? getVectorValue(node, property, axis) : 0
      input.value = value.toFixed(2)
      input.disabled = !this.selected
    }
    this.required<HTMLButtonElement>('#editor-delete').disabled = !this.selected
  }

  setStatus(message: string): void {
    this.status.textContent = message
  }

  loadDocument(document: unknown): boolean {
    const loaded = this.scene.load(document)
    this.syncSelection()
    return loaded
  }

  private required<T extends Element>(selector: string): T {
    const element = document.querySelector<T>(selector)
    if (!element) {
      throw new Error(`Missing editor element ${selector}`)
    }
    return element
  }
}

function getVectorValue(
  node: { position: EditorVector; rotation: EditorVector; scale: EditorVector },
  property: TransformProperty,
  axis: TransformAxis,
): number {
  return node[property][axis]
}

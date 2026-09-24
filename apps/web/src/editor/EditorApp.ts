import { Engine, type PointerPosition } from '@marmot/engine'
import { EditorPanel } from './EditorPanel'
import { EditorScene, type EditorPrimitive } from './EditorScene'
import './editor.css'

export class EditorApp {
  private readonly engine: Engine
  private readonly scene: EditorScene
  private readonly panel: EditorPanel
  private readonly pointerUnsubscribe: () => void

  constructor() {
    mountEditorShell()
    const canvas = document.querySelector<HTMLCanvasElement>('#editor-canvas')
    if (!canvas) {
      throw new Error('Editor canvas is missing')
    }
    this.engine = new Engine(canvas, {
      backgroundColor: [0.08, 0.13, 0.15],
      renderer: {
        lightColor: [1.15, 1.05, 0.92],
        shadowSize: 1024,
      },
    })
    this.scene = new EditorScene(this.engine)
    this.panel = new EditorPanel(this.scene, {
      onAdd: (kind) => this.addObject(kind),
      onRemove: () => this.removeObject(),
      onSave: () => this.save(),
      onLoad: () => this.load(),
      onExport: () => this.export(),
      onReset: () => this.reset(),
      onTransform: (property, axis, value) => {
        this.scene.setTransform(property, axis, value)
        this.panel.setStatus('Changes applied')
      },
      onBack: () => {
        window.location.hash = ''
      },
      onSample: () => {
        window.location.hash = 'sample'
      },
    })
    this.pointerUnsubscribe = this.engine.input.onPointerDown((pointer) => this.pick(pointer))
    this.engine.start(this.scene)
    this.panel.setStatus('Click an object to select it')
  }

  destroy(): void {
    this.pointerUnsubscribe()
    this.engine.destroy()
    this.scene.destroy()
  }

  private addObject(kind: EditorPrimitive): void {
    this.scene.addPrimitive(kind)
    this.panel.syncSelection()
    this.panel.setStatus(`${this.scene.selectedNode?.name ?? 'Object'} added`)
  }

  private removeObject(): void {
    this.scene.removeSelected()
    this.panel.syncSelection()
    this.panel.setStatus('Object removed')
  }

  private save(): void {
    try {
      window.localStorage.setItem('marmot-engine-scene', JSON.stringify(this.scene.serialize()))
      this.panel.setStatus('Scene saved locally')
    } catch {
      this.panel.setStatus('Could not save scene')
    }
  }

  private load(): void {
    const value = window.localStorage.getItem('marmot-engine-scene')
    if (!value) {
      this.panel.setStatus('No saved scene found')
      return
    }
    try {
      const loaded = this.panel.loadDocument(JSON.parse(value) as unknown)
      this.panel.setStatus(loaded ? 'Saved scene loaded' : 'Saved scene is invalid')
    } catch {
      this.panel.setStatus('Saved scene is invalid')
    }
  }

  private export(): void {
    const blob = new Blob([JSON.stringify(this.scene.serialize(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'marmot-engine-scene.json'
    anchor.click()
    URL.revokeObjectURL(url)
    this.panel.setStatus('Scene JSON exported')
  }

  private reset(): void {
    for (const node of [...this.scene.selectable.keys()]) {
      this.scene.remove(node)
    }
    this.scene.addPrimitive('cube')
    this.panel.syncSelection()
    this.panel.setStatus('Scene reset')
  }

  private pick(pointer: PointerPosition): void {
    const node = this.scene.pick(
      pointer.canvasX,
      pointer.canvasY,
      this.engine.canvas.clientWidth,
      this.engine.canvas.clientHeight,
    )
    this.scene.select(node)
    this.panel.syncSelection()
    this.panel.setStatus(node ? `${node.name} selected` : 'No object selected')
  }
}

function mountEditorShell(): void {
  const app = document.querySelector<HTMLElement>('#app')
  if (!app) {
    throw new Error('Application root is missing')
  }
  app.innerHTML = `
    <div class="studio-shell">
      <header class="studio-header">
        <a id="editor-back" class="studio-brand" href="#"><span>M</span><strong>Marmot Engine</strong></a>
        <div class="studio-header-actions"><a id="editor-sample" href="#sample">Play sample game</a><span>Authoring studio</span></div>
      </header>
      <div class="studio-layout">
        <aside id="studio-panel" class="studio-panel">
          <div class="panel-intro"><span class="panel-kicker">Scene builder</span><h1>Make a little world.</h1><p>Place primitives, tune their transforms, and export the scene for another game.</p></div>
          <div class="panel-section"><span class="panel-label">Add object</span><div class="object-buttons"><button data-add="cube" type="button"><i class="object-icon cube-icon"></i>Cube</button><button data-add="orb" type="button"><i class="object-icon orb-icon"></i>Orb</button><button data-add="crystal" type="button"><i class="object-icon crystal-icon"></i>Crystal</button></div></div>
          <div class="panel-section selection-section"><div class="selection-heading"><span class="panel-label">Selected</span><button id="editor-delete" type="button">Delete</button></div><strong id="selection-name">cube-1</strong></div>
          <div class="panel-section"><span class="panel-label">Transform</span><div class="transform-grid"><label>Position X<input data-transform="position.x" type="number" step="0.1" /></label><label>Y<input data-transform="position.y" type="number" step="0.1" /></label><label>Z<input data-transform="position.z" type="number" step="0.1" /></label><label>Rotation X<input data-transform="rotation.x" type="number" step="0.1" /></label><label>Y<input data-transform="rotation.y" type="number" step="0.1" /></label><label>Z<input data-transform="rotation.z" type="number" step="0.1" /></label><label>Scale X<input data-transform="scale.x" type="number" step="0.1" /></label><label>Y<input data-transform="scale.y" type="number" step="0.1" /></label><label>Z<input data-transform="scale.z" type="number" step="0.1" /></label></div></div>
          <div class="panel-section panel-actions"><button id="editor-save" type="button">Save locally</button><button id="editor-load" type="button">Load</button><button id="editor-export" type="button">Export JSON</button><button id="editor-reset" type="button">Reset scene</button></div>
          <p id="editor-status" class="panel-status" aria-live="polite">Ready</p>
        </aside>
        <main class="studio-stage"><canvas id="editor-canvas" aria-label="3D scene editor"></canvas><div class="stage-hint">Click an object to select it · Use the panel to shape the scene</div><div class="stage-corner">WEBGL2 · LIVE</div></main>
      </div>
    </div>`
}

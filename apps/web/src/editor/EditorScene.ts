import {
  Camera,
  createBox,
  createGround,
  createOctahedron,
  createSphere,
  Node,
  Scene,
  transformPoint,
  Vec3,
  type Engine,
  type Mesh,
} from '@marmot/engine'

export type EditorPrimitive = 'cube' | 'orb' | 'crystal'
export type TransformProperty = 'position' | 'rotation' | 'scale'
export type TransformAxis = 'x' | 'y' | 'z'

export interface EditorVector {
  x: number
  y: number
  z: number
}

export interface SerializedEditorObject {
  kind: EditorPrimitive
  name: string
  position: EditorVector
  rotation: EditorVector
  scale: EditorVector
}

export interface EditorDocument {
  version: 1
  objects: SerializedEditorObject[]
}

export class EditorScene extends Scene {
  readonly selectable = new Map<Node, number>()
  private readonly meshes: Record<EditorPrimitive, Mesh>
  private readonly groundMesh: Mesh
  private selected: Node | null = null
  private objectIndex = 0

  constructor(engine: Engine) {
    super(new Camera(), [0.14, 0.2, 0.23])
    this.camera.position.set(8, 7.5, 12)
    this.camera.target.set(0, 0.8, 0)
    this.camera.fieldOfView = 0.72
    this.meshes = {
      cube: engine.renderer.createMesh(createBox([1.4, 1.4, 1.4], [0.95, 0.47, 0.22])),
      orb: engine.renderer.createMesh(createSphere(0.9, 14, 10, [0.18, 0.68, 0.82])),
      crystal: engine.renderer.createMesh(createOctahedron(1.05, [0.52, 0.84, 0.45])),
    }
    this.groundMesh = engine.renderer.createMesh(
      createGround(18, 18, 12, 12, () => 0, () => [0.12, 0.19, 0.18]),
    )
    const ground = new Node('editor-ground')
    ground.mesh = this.groundMesh
    ground.position.y = -0.02
    ground.castShadow = false
    this.add(ground)
    this.addPrimitive('cube')
  }

  get selectedNode(): Node | null {
    return this.selected
  }

  addPrimitive(kind: EditorPrimitive): Node {
    const index = this.objectIndex
    this.objectIndex += 1
    const node = new Node(`${kind}-${index + 1}`)
    node.mesh = this.meshes[kind]
    const angle = index * 1.9
    node.position.set(Math.cos(angle) * 2.4, kind === 'crystal' ? 2.2 : 1.05, Math.sin(angle) * 1.8)
    node.rotation.set(0, angle * 0.35, 0)
    node.scale.set(1, 1, 1)
    const radius = kind === 'orb' ? 1 : kind === 'crystal' ? 1.3 : 1.25
    this.selectable.set(node, radius)
    this.add(node)
    this.select(node)
    return node
  }

  select(node: Node | null): void {
    if (this.selected === node) {
      return
    }
    if (this.selected) {
      this.selected.tint = [1, 1, 1]
    }
    this.selected = node && this.selectable.has(node) ? node : null
    if (this.selected) {
      this.selected.tint = [1.12, 0.88, 0.36]
    }
  }

  removeSelected(): void {
    if (!this.selected) {
      return
    }
    this.selectable.delete(this.selected)
    this.remove(this.selected)
    this.select(null)
  }

  setTransform(property: TransformProperty, axis: TransformAxis, value: number): void {
    if (!this.selected || !Number.isFinite(value)) {
      return
    }
    this.selected[property][axis] = value
  }

  pick(pointerX: number, pointerY: number, width: number, height: number): Node | null {
    const ray = this.camera.screenRay(pointerX, pointerY, width, height)
    const center = new Vec3()
    let closest: Node | null = null
    let closestDistance = Number.POSITIVE_INFINITY
    for (const [node, baseRadius] of this.selectable) {
      if (!node.visible) {
        continue
      }
      transformPoint(center, node.worldMatrix, new Vec3())
      const scale = Math.max(node.scale.x, node.scale.y, node.scale.z)
      const distance = ray.intersectSphere(center, baseRadius * Math.max(scale, 0.1))
      if (distance !== null && distance < closestDistance) {
        closest = node
        closestDistance = distance
      }
    }
    return closest
  }

  serialize(): EditorDocument {
    const objects: SerializedEditorObject[] = []
    for (const node of this.selectable.keys()) {
      const kind = node.mesh === this.meshes.cube
        ? 'cube'
        : node.mesh === this.meshes.orb
          ? 'orb'
          : 'crystal'
      objects.push({
        kind,
        name: node.name,
        position: vectorToRecord(node.position),
        rotation: vectorToRecord(node.rotation),
        scale: vectorToRecord(node.scale),
      })
    }
    return { version: 1, objects }
  }

  load(document: unknown): boolean {
    if (!isRecord(document) || document.version !== 1 || !Array.isArray(document.objects)) {
      return false
    }
    for (const node of this.selectable.keys()) {
      this.remove(node)
    }
    this.selectable.clear()
    this.select(null)
    for (const value of document.objects) {
      if (!isRecord(value) || !isPrimitive(value.kind) || !isRecord(value.position) || !isRecord(value.rotation) || !isRecord(value.scale)) {
        return false
      }
      const node = this.addPrimitive(value.kind)
      node.name = typeof value.name === 'string' ? value.name : node.name
      applyRecord(node.position, value.position)
      applyRecord(node.rotation, value.rotation)
      applyRecord(node.scale, value.scale)
    }
    if (this.selectable.size === 0) {
      this.addPrimitive('cube')
    }
    return true
  }

  destroy(): void {
    this.clear()
    for (const mesh of Object.values(this.meshes)) {
      mesh.destroy()
    }
    this.groundMesh.destroy()
  }
}

function vectorToRecord(vector: Vec3): EditorVector {
  return { x: vector.x, y: vector.y, z: vector.z }
}

function applyRecord(target: Vec3, value: Record<string, unknown>): void {
  target.set(
    typeof value.x === 'number' ? value.x : target.x,
    typeof value.y === 'number' ? value.y : target.y,
    typeof value.z === 'number' ? value.z : target.z,
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPrimitive(value: unknown): value is EditorPrimitive {
  return value === 'cube' || value === 'orb' || value === 'crystal'
}

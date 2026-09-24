import { Vec3 } from '../math/Vec3'
import type { Mat4 } from '../math/Mat4'
import type { Mesh } from '../render/Mesh'

export type Color = readonly [number, number, number]

let nextNodeId = 1

export class Node {
  readonly id = nextNodeId
  name: string
  readonly children = new Set<Node>()
  parent: Node | null = null
  position = new Vec3()
  rotation = new Vec3()
  scale = Vec3.one()
  tint: Color = [1, 1, 1]
  mesh: Mesh | null = null
  readonly worldMatrix: Mat4 = new Float32Array(16)
  readonly normalMatrix = new Float32Array(9)
  visible = true
  castShadow = true
  updateCallback: ((node: Node, deltaTime: number) => void) | null = null

  constructor(name = `node-${nextNodeId}`) {
    this.name = name
    nextNodeId += 1
  }

  setParent(parent: Node | null): void {
    if (this.parent === parent) {
      return
    }
    this.parent?.children.delete(this)
    this.parent = parent
    if (parent) {
      parent.children.add(this)
    }
  }

  remove(): void {
    for (const child of [...this.children]) {
      child.setParent(null)
    }
    this.setParent(null)
  }
}

export class Entity extends Node {
  hitRadius = 0
  userData = new Map<string, unknown>()

  onUpdate(callback: (entity: Entity, deltaTime: number) => void): void {
    this.updateCallback = (node, deltaTime) => callback(node as Entity, deltaTime)
  }
}

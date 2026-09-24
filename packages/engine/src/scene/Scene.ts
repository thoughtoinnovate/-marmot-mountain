import type { Camera } from '../math/Camera'
import { fromTRS, multiplyMat4, normalMatrix3, type Mat4 } from '../math/Mat4'
import { Vec3 } from '../math/Vec3'
import { Node } from './Node'

export class Scene {
  readonly root = new Node('scene-root')
  readonly objects = new Set<Node>()
  readonly camera: Camera
  backgroundColor: readonly [number, number, number]
  private readonly localMatrix: Mat4

  constructor(
    camera: Camera,
    backgroundColor: readonly [number, number, number] = [0.49, 0.78, 0.88],
  ) {
    this.camera = camera
    this.backgroundColor = backgroundColor
    this.localMatrix = fromTRS(new Float32Array(16), new Vec3(), new Vec3(), Vec3.one())
    this.root.setParent(null)
  }

  add<T extends Node>(node: T): T {
    this.objects.add(node)
    node.setParent(this.root)
    return node
  }

  remove(node: Node): void {
    this.objects.delete(node)
    node.remove()
  }

  clear(): void {
    for (const node of this.objects) {
      node.remove()
    }
    this.objects.clear()
  }

  update(deltaTime: number): void {
    this.root.visible = true
    this.updateNode(this.root, deltaTime, null)
  }

  private updateNode(node: Node, deltaTime: number, parentWorld: Mat4 | null): void {
    if (!node.visible && node !== this.root) {
      return
    }
    if (node.updateCallback) {
      node.updateCallback(node, deltaTime)
    }
    fromTRS(this.localMatrix, node.position, node.rotation, node.scale)
    if (parentWorld) {
      multiplyMat4(node.worldMatrix, parentWorld, this.localMatrix)
    } else {
      node.worldMatrix.set(this.localMatrix)
    }
    normalMatrix3(node.normalMatrix, node.worldMatrix)
    for (const child of node.children) {
      this.updateNode(child, deltaTime, node.worldMatrix)
    }
  }
}

import { Entity, Node, transformPoint, Vec3 } from '@marmot/engine'
import type { Difficulty } from './difficulty'
import type { MeshLibrary } from './MeshLibrary'

type TargetPhase = 'hidden' | 'rising' | 'waiting' | 'falling' | 'caught'

export interface HolePosition {
  x: number
  z: number
}

export interface TargetCallbacks {
  onMiss: (target: MarmotTarget) => void
  onFinished: (target: MarmotTarget) => void
}

interface PartTransform {
  position: { x: number; y: number; z: number }
  scale: { x: number; y: number; z: number }
  rotation?: { x: number; y: number; z: number }
}

export class MarmotTarget extends Entity {
  private phase: TargetPhase = 'hidden'
  private phaseTime = 0
  private difficulty: Difficulty | null = null
  private waitingTime = 0
  private completed = false
  private updatesEnabled = true
  private baseYaw: number
  private behaviorSeed = 0
  private riseDuration = 0
  private holdDuration = 0
  private fallDuration = 0
  private lookSpeed = 1

  constructor(
    name: string,
    readonly hole: HolePosition,
    meshes: MeshLibrary,
    private readonly callbacks: TargetCallbacks,
  ) {
    super(name)
    this.baseYaw = (Math.random() - 0.5) * 0.2
    this.rotation.y = this.baseYaw
    this.visible = false
    this.hitRadius = 0.82
    this.buildModel(meshes)
    this.onUpdate((_entity, deltaTime) => this.update(deltaTime))
  }

  get active(): boolean {
    return this.phase !== 'hidden' && !this.completed
  }

  get hittable(): boolean {
    return (
      !this.completed &&
      (this.phase === 'waiting' || (this.phase === 'rising' && this.position.y > -0.72))
    )
  }

  get reactionTime(): number {
    return this.waitingTime
  }

  activate(difficulty: Difficulty, behaviorSeed = Math.random()): void {
    this.difficulty = difficulty
    this.behaviorSeed = behaviorSeed
    this.riseDuration = difficulty.riseDuration * (0.88 + behaviorSeed * 0.24)
    this.holdDuration = difficulty.holdDuration * (0.82 + behaviorSeed * 0.36)
    this.fallDuration = difficulty.fallDuration * (0.9 + behaviorSeed * 0.2)
    this.lookSpeed = 2.2 + behaviorSeed * 2.4
    this.baseYaw = (behaviorSeed - 0.5) * 0.32
    this.phase = 'rising'
    this.phaseTime = 0
    this.waitingTime = 0
    this.completed = false
    this.visible = true
    this.position.y = -1.4
    this.rotation.set(0, this.baseYaw, 0)
    this.scale.set(1, 1, 1)
  }

  catch(): boolean {
    if (!this.hittable) {
      return false
    }
    this.phase = 'caught'
    this.phaseTime = 0
    return true
  }

  dismiss(): void {
    if (this.completed || this.phase === 'hidden' || this.phase === 'caught') {
      return
    }
    this.phase = 'falling'
    this.phaseTime = 0
  }

  finishImmediately(): void {
    this.phase = 'hidden'
    this.phaseTime = 0
    this.completed = false
    this.visible = false
  }

  setUpdatesEnabled(enabled: boolean): void {
    this.updatesEnabled = enabled
  }

  hitCenter(out: Vec3): Vec3 {
    return transformPoint(out, this.worldMatrix, new Vec3(0, 1.22, 0.16))
  }

  update(deltaTime: number): void {
    if (!this.updatesEnabled || !this.difficulty || this.phase === 'hidden' || this.completed) {
      return
    }
    this.phaseTime += deltaTime
    if (this.phase === 'rising') {
      const progress = Math.min(1, this.phaseTime / this.riseDuration)
      const eased = easeOutBack(progress)
      this.position.y = -1.4 * (1 - eased)
      if (progress >= 1) {
        this.phase = 'waiting'
        this.phaseTime = 0
        this.waitingTime = 0
      }
    } else if (this.phase === 'waiting') {
      this.waitingTime += deltaTime
      this.position.y = Math.sin(this.waitingTime * 4.2) * 0.035
      this.rotation.y = this.baseYaw + Math.sin(this.waitingTime * this.lookSpeed + this.behaviorSeed * 6.28) * 0.18
      this.rotation.z = Math.sin(this.waitingTime * 2.1 + this.behaviorSeed * 4) * 0.035
      if (this.waitingTime >= this.holdDuration) {
        this.phase = 'falling'
        this.phaseTime = 0
      }
    } else if (this.phase === 'falling') {
      const duration = this.fallDuration
      const progress = Math.min(1, this.phaseTime / duration)
      this.position.y = -1.4 * easeInCubic(progress)
      if (progress >= 1) {
        this.complete()
      }
    } else if (this.phase === 'caught') {
      const progress = Math.min(1, this.phaseTime / 0.34)
      const pop = Math.sin(progress * Math.PI)
      this.position.y = pop * 0.36
      const scale = 1 + pop * 0.22
      this.scale.set(scale, scale, scale)
      if (progress >= 1) {
        this.complete()
      }
    }
  }

  private complete(): void {
    if (this.completed) {
      return
    }
    const wasMiss = this.phase === 'falling'
    this.completed = true
    this.visible = false
    this.position.y = 0
    this.rotation.set(0, this.baseYaw, 0)
    this.scale.set(1, 1, 1)
    if (wasMiss) {
      this.callbacks.onMiss(this)
    }
    this.callbacks.onFinished(this)
  }

  private buildModel(meshes: MeshLibrary): void {
    this.addPart('body', meshes.body, { position: { x: 0, y: 0.58, z: 0 }, scale: { x: 0.82, y: 1, z: 0.78 } })
    this.addPart('belly', meshes.belly, { position: { x: 0, y: 0.58, z: 0.43 }, scale: { x: 0.62, y: 0.78, z: 0.36 } })
    this.addPart('head', meshes.head, { position: { x: 0, y: 1.27, z: 0.03 }, scale: { x: 1, y: 0.96, z: 0.94 } })
    this.addPart('muzzle', meshes.muzzle, { position: { x: 0, y: 1.15, z: 0.52 }, scale: { x: 1, y: 0.72, z: 0.55 } })
    this.addPart('nose', meshes.nose, { position: { x: 0, y: 1.26, z: 0.77 }, scale: { x: 1, y: 0.8, z: 0.8 } })
    this.addPart('left-ear', meshes.ear, { position: { x: -0.49, y: 1.53, z: 0 }, scale: { x: 1, y: 1, z: 0.7 } })
    this.addPart('right-ear', meshes.ear, { position: { x: 0.49, y: 1.53, z: 0 }, scale: { x: 1, y: 1, z: 0.7 } })
    this.addPart('left-eye', meshes.eye, { position: { x: -0.22, y: 1.43, z: 0.53 }, scale: { x: 1, y: 1.1, z: 0.7 } })
    this.addPart('right-eye', meshes.eye, { position: { x: 0.22, y: 1.43, z: 0.53 }, scale: { x: 1, y: 1.1, z: 0.7 } })
    this.addPart('left-glint', meshes.eyeHighlight, { position: { x: -0.245, y: 1.465, z: 0.598 }, scale: { x: 1, y: 1, z: 0.6 } })
    this.addPart('right-glint', meshes.eyeHighlight, { position: { x: 0.195, y: 1.465, z: 0.598 }, scale: { x: 1, y: 1, z: 0.6 } })
    this.addPart('tooth', meshes.tooth, { position: { x: 0, y: 0.96, z: 0.73 }, scale: { x: 1, y: 1, z: 1 } })
    this.addPart('left-paw', meshes.body, { position: { x: -0.49, y: 0.32, z: 0.29 }, scale: { x: 0.25, y: 0.42, z: 0.22 }, rotation: { x: 0, y: 0, z: -0.45 } })
    this.addPart('right-paw', meshes.body, { position: { x: 0.49, y: 0.32, z: 0.29 }, scale: { x: 0.25, y: 0.42, z: 0.22 }, rotation: { x: 0, y: 0, z: 0.45 } })
  }

  private addPart(name: string, mesh: MeshLibrary['particle'], transform: PartTransform): void {
    const part = new Node(name)
    part.mesh = mesh
    part.position.set(transform.position.x, transform.position.y, transform.position.z)
    part.scale.set(transform.scale.x, transform.scale.y, transform.scale.z)
    if (transform.rotation) {
      part.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z)
    }
    part.castShadow = name !== 'left-glint' && name !== 'right-glint'
    if (name.includes('glint')) {
      part.roughness = 0.12
      part.emissive = [0.6, 0.54, 0.3]
      part.detailStrength = 0
    } else if (name.includes('eye') || name === 'nose' || name === 'tooth') {
      part.roughness = name === 'tooth' ? 0.32 : 0.2
      part.detailStrength = 0.01
    } else {
      part.roughness = name.includes('belly') || name.includes('muzzle') ? 0.88 : 0.94
      part.detailStrength = name.includes('belly') || name.includes('muzzle') ? 0.075 : 0.1
    }
    part.setParent(this)
  }
}

function easeOutBack(value: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2)
}

function easeInCubic(value: number): number {
  return value * value * value
}

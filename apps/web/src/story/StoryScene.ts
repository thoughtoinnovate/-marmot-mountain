import {
  Camera,
  createBox,
  createCylinder,
  createFeather,
  createSphere,
  createStar,
  createTorus,
  Entity,
  Node,
  Scene,
  transformPoint,
  Vec3,
  type Engine,
  type Mesh,
} from '@marmot/engine'
import { MeshLibrary, groundHeight } from '../game/MeshLibrary'
import {
  STORY_CHAPTERS,
  getStoryTask,
  type StoryChapter,
  type StoryChoice,
  type StoryTask,
  type StoryVoiceRole,
} from './storyData'
import type { StoryDifficulty } from './StoryUI'

export interface StorySceneCallbacks {
  onTask: (chapterIndex: number, taskIndex: number, task: StoryTask, chapter: StoryChapter) => void
  onVoice: (text: string, role: StoryVoiceRole, clipKey: string) => void
  onTryAgain: (hint: string) => void
  onSuccess: (message: string) => void
  onComplete: () => void
}

type StoryPhase = 'waiting' | 'celebrating' | 'complete'

export class StoryScene extends Scene {
  private readonly meshes: MeshLibrary
  private readonly storyBox: Mesh
  private readonly storyCone: Mesh
  private readonly storyRing: Mesh
  private readonly storySphere: Mesh
  private readonly storyLeaf: Mesh
  private readonly storyStar: Mesh
  private readonly storyFeather: Mesh
  private readonly storyLeg: Mesh
  private readonly storyPetal: Mesh
  private readonly choiceNodes = new Map<string, Entity>()
  private readonly guide: Node
  private chapterIndex = 0
  private taskIndex = 0
  private phase: StoryPhase = 'waiting'
  private difficulty: StoryDifficulty = 1
  private celebrateTime = 0
  private currentChoice: Entity | null = null

  constructor(
    engine: Engine,
    private readonly callbacks: StorySceneCallbacks,
  ) {
    super(new Camera(), [0.48, 0.73, 0.84])
    this.camera.position.set(0, 6.7, 13.8)
    this.camera.target.set(0, 1, -1.4)
    this.camera.fieldOfView = 0.76
    this.meshes = new MeshLibrary(engine.renderer)
    this.storyBox = engine.renderer.createMesh(createBox([1.1, 1.1, 0.45], [0.78, 0.27, 0.2]))
    this.storyCone = engine.renderer.createMesh(createCylinder(0, 0.65, 1.1, 14, [0.95, 0.38, 0.1], [0.78, 0.24, 0.08]))
    this.storyRing = engine.renderer.createMesh(createTorus(0.62, 0.13, 20, 7, [0.48, 0.27, 0.1]))
    this.storySphere = engine.renderer.createMesh(createSphere(0.55, 16, 11, [0.58, 0.34, 0.15]))
    this.storyLeaf = engine.renderer.createMesh(createSphere(0.58, 14, 10, [0.18, 0.62, 0.23]))
    this.storyStar = engine.renderer.createMesh(createStar(0.72, 0.3, 5, 0.12, [1, 0.78, 0.2]))
    this.storyFeather = engine.renderer.createMesh(createFeather(1.25, 0.56, 0.1, [0.92, 0.86, 0.7]))
    this.storyLeg = engine.renderer.createMesh(createCylinder(0.06, 0.08, 0.58, 8, [0.3, 0.16, 0.06]))
    this.storyPetal = engine.renderer.createMesh(createSphere(0.28, 10, 7, [1, 0.78, 0.74]))
    this.createEnvironment()
    this.guide = new Node('gentle-story-guide')
    this.guide.mesh = this.storyRing
    this.guide.tint = [1.15, 0.75, 0.3]
    this.guide.emissive = [0.34, 0.18, 0.03]
    this.guide.roughness = 0.35
    this.guide.detailStrength = 0
    this.guide.castShadow = false
    this.guide.visible = false
    this.add(this.guide)
    this.loadTask()
  }

  start(): void {
    this.chapterIndex = 0
    this.taskIndex = 0
    this.phase = 'waiting'
    this.loadTask()
  }

  setDifficulty(difficulty: StoryDifficulty): void {
    this.difficulty = difficulty
    if (this.phase === 'waiting') {
      this.loadTask()
    }
  }

  pick(pointerX: number, pointerY: number, width: number, height: number): string | null {
    if (this.phase !== 'waiting') {
      return null
    }
    const ray = this.camera.screenRay(pointerX, pointerY, width, height)
    const center = new Vec3()
    let closestId: string | null = null
    let closestDistance = Number.POSITIVE_INFINITY
    for (const [id, node] of this.choiceNodes) {
      transformPoint(center, node.worldMatrix, new Vec3(0, 0.65, 0))
      const distance = ray.intersectSphere(center, node.hitRadius)
      if (distance !== null && distance < closestDistance) {
        closestId = id
        closestDistance = distance
      }
    }
    return closestId
  }

  choose(choiceId: string): boolean {
    if (this.phase !== 'waiting') {
      return false
    }
    const task = this.currentTask()
    if (!task) {
      return false
    }
    const choice = task.choices.find(value => value.id === choiceId)
    if (!choice) {
      return false
    }
    if (choice.id !== task.correctId) {
      this.callbacks.onTryAgain(task.hint)
      this.callbacks.onVoice(task.hint, 'narrator', `${task.id}:hint`)
      return true
    }
    this.phase = 'celebrating'
    this.celebrateTime = 0
    this.currentChoice = this.choiceNodes.get(choice.id) ?? null
    this.guide.visible = false
    this.callbacks.onSuccess('You helped the meadow!')
    this.callbacks.onVoice('Wonderful! You helped the meadow.', 'marmot', `${task.id}:success`)
    return true
  }

  override update(deltaTime: number): void {
    if (this.phase === 'celebrating') {
      this.celebrateTime += deltaTime
      const pop = Math.sin(Math.min(1, this.celebrateTime / 0.5) * Math.PI)
      if (this.currentChoice) {
        const scale = 1 + pop * 0.2
        this.currentChoice.scale.set(scale, scale, scale)
      }
      if (this.celebrateTime >= 1.35) {
        this.currentChoice?.scale.set(1, 1, 1)
        this.currentChoice = null
        this.advanceTask()
      }
    } else if (this.phase === 'waiting' && this.guide.visible) {
      const pulse = 1 + Math.sin(performance.now() * 0.0024) * 0.07
      this.guide.scale.set(pulse, pulse, pulse)
      this.guide.rotation.y += deltaTime * 0.4
    }
    super.update(deltaTime)
  }

  destroy(): void {
    this.clear()
    this.meshes.destroy()
    this.storyBox.destroy()
    this.storyCone.destroy()
    this.storyRing.destroy()
    this.storySphere.destroy()
    this.storyLeaf.destroy()
    this.storyStar.destroy()
    this.storyFeather.destroy()
    this.storyLeg.destroy()
    this.storyPetal.destroy()
  }

  private loadTask(): void {
    const task = this.currentTask()
    const chapter = STORY_CHAPTERS[this.chapterIndex]
    if (!task || !chapter) {
      return
    }
    this.removeChoices()
    const easyDistractor = task.choices.find(choiceData => choiceData.id !== task.correctId)
    const choices = this.difficulty === 1 && easyDistractor
      ? task.choices.filter(choiceData => choiceData.id === task.correctId || choiceData.id === easyDistractor.id)
      : task.choices
    for (const choice of choices) {
      const node = this.createChoiceNode(choice)
      this.choiceNodes.set(choice.id, node)
      this.add(node)
    }
    const correctNode = this.choiceNodes.get(task.correctId)
    if (correctNode) {
      this.guide.position.set(correctNode.position.x, correctNode.position.y + 0.05, correctNode.position.z)
      this.guide.scale.set(1, 1, 1)
      this.guide.visible = true
    }
    this.phase = 'waiting'
    this.callbacks.onTask(this.chapterIndex, this.taskIndex, task, chapter)
  }

  private advanceTask(): void {
    if (this.taskIndex < 2) {
      this.taskIndex += 1
      this.loadTask()
      return
    }
    if (this.chapterIndex < STORY_CHAPTERS.length - 1) {
      this.chapterIndex += 1
      this.taskIndex = 0
      this.loadTask()
      return
    }
    this.phase = 'complete'
    this.guide.visible = false
    this.callbacks.onComplete()
  }

  private currentTask(): StoryTask | null {
    return getStoryTask(this.chapterIndex, this.taskIndex)
  }

  private removeChoices(): void {
    for (const node of this.choiceNodes.values()) {
      this.remove(node)
    }
    this.choiceNodes.clear()
    this.currentChoice = null
  }

  private createChoiceNode(choice: StoryChoice): Entity {
    const root = new Entity(`story-choice-${choice.id}`)
    root.position.set(choice.position.x, groundHeight(choice.position.x, choice.position.z) + 0.8, choice.position.z)
    root.hitRadius = 0.78
    const part = (
      name: string,
      mesh: Mesh,
      position: { x: number; y: number; z: number },
      scale: { x: number; y: number; z: number },
      rotation?: { x: number; y: number; z: number },
      tint: readonly [number, number, number] = choice.tint,
      roughness = 0.88,
      detailStrength = 0.04,
      castShadow = true,
    ): void => {
      const child = new Node(`${choice.id}-${name}`)
      child.mesh = mesh
      child.position.set(position.x, position.y, position.z)
      child.scale.set(scale.x, scale.y, scale.z)
      child.tint = tint
      child.roughness = roughness
      child.detailStrength = detailStrength
      child.castShadow = castShadow
      if (rotation) {
        child.rotation.set(rotation.x, rotation.y, rotation.z)
      }
      child.setParent(root)
    }
    switch (choice.kind) {
      case 'flower':
        part('stem', this.meshes.treeTrunk, { x: 0, y: -0.05, z: 0 }, { x: 0.14, y: 0.5, z: 0.14 }, undefined, [0.15, 0.48, 0.18], 0.95, 0.05)
        for (let index = 0; index < 6; index += 1) {
          const angle = (index / 6) * Math.PI * 2
          part(`petal-${index}`, this.storyPetal, { x: Math.cos(angle) * 0.34, y: 0.66, z: Math.sin(angle) * 0.34 }, { x: 0.22, y: 0.12, z: 0.3 }, { x: 0, y: -angle, z: 0 }, [1, 0.58, 0.58], 0.78, 0.03)
        }
        part('flower-center', this.storySphere, { x: 0, y: 0.66, z: 0 }, { x: 0.28, y: 0.2, z: 0.28 }, undefined, [1, 0.7, 0.1], 0.7, 0.02)
        part('flower-leaf', this.storyLeaf, { x: 0.28, y: 0.2, z: 0 }, { x: 0.16, y: 0.4, z: 0.1 }, { x: 0, y: 0, z: -0.6 }, [0.16, 0.55, 0.2], 0.9, 0.04)
        break
      case 'acorn':
        part('acorn-body', this.storySphere, { x: 0, y: 0.35, z: 0 }, { x: 0.78, y: 1, z: 0.78 }, undefined, [0.66, 0.36, 0.12], 0.88, 0.07)
        part('acorn-cap', this.storyCone, { x: 0, y: 0.82, z: 0 }, { x: 0.72, y: 0.38, z: 0.72 }, { x: Math.PI, y: 0, z: 0 }, [0.28, 0.14, 0.05], 0.96, 0.05)
        part('acorn-ridge', this.storyRing, { x: 0, y: 0.75, z: 0 }, { x: 0.72, y: 0.1, z: 0.72 }, undefined, [0.18, 0.08, 0.03], 0.98, 0.04)
        part('acorn-stem', this.storyLeg, { x: 0, y: 1.08, z: 0 }, { x: 0.35, y: 0.22, z: 0.35 }, { x: 0, y: 0, z: 0.15 }, [0.24, 0.12, 0.04], 0.98, 0.04)
        break
      case 'rock':
        part('rock-main', this.meshes.rock, { x: 0, y: 0.28, z: 0 }, { x: 1.2, y: 0.75, z: 1 }, undefined, [0.38, 0.4, 0.39], 0.98, 0.12)
        part('rock-small', this.meshes.rock, { x: 0.5, y: 0.12, z: 0.05 }, { x: 0.55, y: 0.35, z: 0.5 }, undefined, [0.28, 0.31, 0.3], 1, 0.1)
        part('rock-highlight', this.meshes.rock, { x: -0.38, y: 0.42, z: 0.08 }, { x: 0.35, y: 0.22, z: 0.32 }, undefined, [0.52, 0.54, 0.5], 0.92, 0.08, false)
        break
      case 'star':
        part('star', this.storyStar, { x: 0, y: 0.72, z: 0 }, { x: 1, y: 1, z: 1 }, undefined, [1, 0.8, 0.2], 0.48, 0.02)
        part('star-center', this.storySphere, { x: 0, y: 0.72, z: 0.05 }, { x: 0.18, y: 0.18, z: 0.1 }, undefined, [1, 0.92, 0.5], 0.35, 0.01, false)
        break
      case 'leaf':
        part('leaf-main', this.storyLeaf, { x: 0, y: 0.65, z: 0 }, { x: 0.6, y: 1.15, z: 0.34 }, { x: 0, y: 0.35, z: 0.42 }, [0.17, 0.62, 0.22], 0.9, 0.05)
        part('leaf-rib', this.storyLeg, { x: 0, y: 0.62, z: 0.02 }, { x: 0.08, y: 0.8, z: 0.08 }, { x: 0, y: 0.25, z: 0.42 }, [0.38, 0.68, 0.25], 0.96, 0.04, false)
        break
      case 'berry':
        part('berry-left', this.storySphere, { x: -0.18, y: 0.45, z: 0.02 }, { x: 0.45, y: 0.48, z: 0.45 }, undefined, [0.82, 0.12, 0.2], 0.35, 0.03)
        part('berry-right', this.storySphere, { x: 0.2, y: 0.48, z: -0.02 }, { x: 0.42, y: 0.45, z: 0.42 }, undefined, [0.95, 0.2, 0.24], 0.35, 0.03)
        part('berry-front', this.storySphere, { x: 0, y: 0.3, z: 0.28 }, { x: 0.4, y: 0.4, z: 0.4 }, undefined, [0.72, 0.08, 0.16], 0.35, 0.03)
        part('berry-leaf', this.storyLeaf, { x: 0.14, y: 0.9, z: 0 }, { x: 0.3, y: 0.42, z: 0.18 }, { x: 0, y: 0, z: 0.5 }, [0.16, 0.55, 0.2], 0.9, 0.04)
        break
      case 'marmot':
        part('marmot-body', this.meshes.body, { x: 0, y: 0.4, z: 0 }, { x: 0.56, y: 0.76, z: 0.5 }, undefined, [0.55, 0.3, 0.14], 0.96, 0.1)
        part('marmot-belly', this.meshes.belly, { x: 0, y: 0.4, z: 0.36 }, { x: 0.38, y: 0.56, z: 0.18 }, undefined, [0.86, 0.62, 0.32], 0.9, 0.07)
        part('marmot-head', this.meshes.head, { x: 0, y: 0.98, z: 0.02 }, { x: 0.5, y: 0.53, z: 0.48 }, undefined, [0.6, 0.33, 0.15], 0.95, 0.1)
        part('marmot-muzzle', this.meshes.muzzle, { x: 0, y: 0.91, z: 0.36 }, { x: 0.27, y: 0.2, z: 0.2 }, undefined, [0.86, 0.62, 0.3], 0.88, 0.06)
        part('marmot-nose', this.meshes.nose, { x: 0, y: 0.98, z: 0.52 }, { x: 0.14, y: 0.12, z: 0.1 }, undefined, [0.08, 0.035, 0.025], 0.3, 0.01, false)
        part('marmot-eye-left', this.meshes.eye, { x: -0.16, y: 1.08, z: 0.37 }, { x: 0.12, y: 0.12, z: 0.08 }, undefined, [0.03, 0.02, 0.015], 0.2, 0, false)
        part('marmot-eye-right', this.meshes.eye, { x: 0.16, y: 1.08, z: 0.37 }, { x: 0.12, y: 0.12, z: 0.08 }, undefined, [0.03, 0.02, 0.015], 0.2, 0, false)
        part('marmot-ear-left', this.meshes.ear, { x: -0.38, y: 1.24, z: 0 }, { x: 0.2, y: 0.25, z: 0.12 }, undefined, [0.46, 0.22, 0.1], 0.96, 0.08)
        part('marmot-ear-right', this.meshes.ear, { x: 0.38, y: 1.24, z: 0 }, { x: 0.2, y: 0.25, z: 0.12 }, undefined, [0.46, 0.22, 0.1], 0.96, 0.08)
        part('marmot-paw-left', this.meshes.body, { x: -0.36, y: 0.18, z: 0.25 }, { x: 0.18, y: 0.25, z: 0.15 }, { x: 0, y: 0, z: -0.3 }, [0.5, 0.27, 0.12], 0.96, 0.08)
        part('marmot-paw-right', this.meshes.body, { x: 0.36, y: 0.18, z: 0.25 }, { x: 0.18, y: 0.25, z: 0.15 }, { x: 0, y: 0, z: 0.3 }, [0.5, 0.27, 0.12], 0.96, 0.08)
        break
      case 'squirrel':
        part('squirrel-body', this.meshes.body, { x: 0, y: 0.46, z: 0 }, { x: 0.48, y: 0.78, z: 0.48 }, undefined, [0.64, 0.32, 0.14], 0.96, 0.1)
        part('squirrel-belly', this.meshes.belly, { x: 0, y: 0.43, z: 0.3 }, { x: 0.3, y: 0.48, z: 0.15 }, undefined, [0.86, 0.62, 0.32], 0.9, 0.06)
        part('squirrel-head', this.meshes.head, { x: 0, y: 1.04, z: 0.03 }, { x: 0.46, y: 0.5, z: 0.45 }, undefined, [0.68, 0.35, 0.15], 0.96, 0.1)
        part('squirrel-ear-left', this.meshes.ear, { x: -0.34, y: 1.3, z: 0 }, { x: 0.18, y: 0.28, z: 0.12 }, undefined, [0.5, 0.23, 0.1], 0.96, 0.08)
        part('squirrel-ear-right', this.meshes.ear, { x: 0.34, y: 1.3, z: 0 }, { x: 0.18, y: 0.28, z: 0.12 }, undefined, [0.5, 0.23, 0.1], 0.96, 0.08)
        part('squirrel-eye-left', this.meshes.eye, { x: -0.15, y: 1.12, z: 0.36 }, { x: 0.1, y: 0.1, z: 0.07 }, undefined, [0.03, 0.02, 0.015], 0.2, 0, false)
        part('squirrel-eye-right', this.meshes.eye, { x: 0.15, y: 1.12, z: 0.36 }, { x: 0.1, y: 0.1, z: 0.07 }, undefined, [0.03, 0.02, 0.015], 0.2, 0, false)
        part('squirrel-nose', this.meshes.nose, { x: 0, y: 1.02, z: 0.48 }, { x: 0.13, y: 0.1, z: 0.1 }, undefined, [0.08, 0.035, 0.025], 0.3, 0.01, false)
        for (let index = 0; index < 3; index += 1) {
          part(`squirrel-tail-feather-${index}`, this.storyFeather, { x: 0.3 + index * 0.08, y: 0.58 + index * 0.08, z: -0.28 }, { x: 0.22, y: 0.62, z: 0.08 }, { x: 0, y: 0, z: -0.55 + index * 0.16 }, [0.72, 0.4, 0.16], 0.96, 0.08)
        }
        part('squirrel-paw-left', this.meshes.body, { x: -0.3, y: 0.16, z: 0.2 }, { x: 0.16, y: 0.2, z: 0.12 }, undefined, [0.58, 0.3, 0.13], 0.96, 0.08)
        part('squirrel-paw-right', this.meshes.body, { x: 0.3, y: 0.16, z: 0.2 }, { x: 0.16, y: 0.2, z: 0.12 }, undefined, [0.58, 0.3, 0.13], 0.96, 0.08)
        break
      case 'nest':
        part('nest-body', this.storyRing, { x: 0, y: 0.38, z: 0 }, { x: 1.1, y: 0.7, z: 1.1 }, undefined, [0.48, 0.28, 0.1], 0.98, 0.1)
        part('nest-rim', this.storyRing, { x: 0, y: 0.6, z: 0 }, { x: 0.88, y: 0.22, z: 0.88 }, undefined, [0.62, 0.38, 0.14], 0.98, 0.08)
        for (let index = 0; index < 4; index += 1) {
          const angle = (index / 4) * Math.PI * 2
          part(`nest-twig-${index}`, this.storyLeg, { x: Math.cos(angle) * 0.3, y: 0.42, z: Math.sin(angle) * 0.3 }, { x: 0.45, y: 0.25, z: 0.45 }, { x: 0, y: 0, z: angle }, [0.3, 0.16, 0.06], 0.98, 0.07)
        }
        part('nest-leaf', this.storyLeaf, { x: 0.22, y: 0.65, z: 0.05 }, { x: 0.22, y: 0.35, z: 0.12 }, { x: 0, y: 0.3, z: 0.45 }, [0.18, 0.55, 0.2], 0.92, 0.04)
        break
      case 'bird':
        part('bird-body', this.storySphere, { x: 0, y: 0.52, z: 0 }, { x: 0.55, y: 0.72, z: 0.46 }, undefined, [0.16, 0.46, 0.72], 0.82, 0.05)
        part('bird-chest', this.storySphere, { x: 0, y: 0.48, z: 0.27 }, { x: 0.37, y: 0.48, z: 0.2 }, undefined, [0.32, 0.68, 0.82], 0.84, 0.04)
        part('bird-neck', this.storySphere, { x: 0, y: 0.86, z: 0.02 }, { x: 0.28, y: 0.34, z: 0.28 }, undefined, [0.16, 0.46, 0.72], 0.8, 0.04)
        part('bird-head', this.storySphere, { x: 0, y: 1.12, z: 0.03 }, { x: 0.36, y: 0.36, z: 0.36 }, undefined, [0.2, 0.52, 0.78], 0.78, 0.04)
        part('bird-beak', this.storyCone, { x: 0, y: 1.1, z: 0.4 }, { x: 0.2, y: 0.26, z: 0.2 }, { x: Math.PI / 2, y: 0, z: 0 }, [1, 0.55, 0.12], 0.42, 0.01)
        part('bird-eye-left', this.meshes.eye, { x: -0.14, y: 1.2, z: 0.3 }, { x: 0.09, y: 0.09, z: 0.06 }, undefined, [0.02, 0.015, 0.01], 0.18, 0, false)
        part('bird-eye-right', this.meshes.eye, { x: 0.14, y: 1.2, z: 0.3 }, { x: 0.09, y: 0.09, z: 0.06 }, undefined, [0.02, 0.015, 0.01], 0.18, 0, false)
        part('bird-eye-glint-left', this.meshes.eyeHighlight, { x: -0.16, y: 1.23, z: 0.34 }, { x: 0.035, y: 0.035, z: 0.02 }, undefined, [1, 0.95, 0.7], 0.15, 0, false)
        part('bird-eye-glint-right', this.meshes.eyeHighlight, { x: 0.12, y: 1.23, z: 0.34 }, { x: 0.035, y: 0.035, z: 0.02 }, undefined, [1, 0.95, 0.7], 0.15, 0, false)
        for (let index = 0; index < 3; index += 1) {
          part(`bird-wing-left-${index}`, this.storyFeather, { x: -0.42 - index * 0.06, y: 0.62 - index * 0.08, z: 0.02 }, { x: 0.16, y: 0.5 - index * 0.04, z: 0.06 }, { x: 0, y: 0, z: -0.45 + index * 0.15 }, [0.1, 0.32, 0.6], 0.86, 0.06)
          part(`bird-wing-right-${index}`, this.storyFeather, { x: 0.42 + index * 0.06, y: 0.62 - index * 0.08, z: 0.02 }, { x: 0.16, y: 0.5 - index * 0.04, z: 0.06 }, { x: 0, y: 0, z: 0.45 - index * 0.15 }, [0.1, 0.32, 0.6], 0.86, 0.06)
        }
        for (let index = 0; index < 3; index += 1) {
          part(`bird-tail-${index}`, this.storyFeather, { x: (index - 1) * 0.12, y: 0.35, z: -0.35 }, { x: 0.14, y: 0.5, z: 0.06 }, { x: Math.PI / 2, y: 0, z: (index - 1) * 0.12 }, [0.1, 0.32, 0.6], 0.86, 0.06)
        }
        part('bird-leg-left', this.storyLeg, { x: -0.12, y: 0.05, z: 0 }, { x: 0.7, y: 0.7, z: 0.7 }, undefined, [0.42, 0.22, 0.08], 0.9, 0.04)
        part('bird-leg-right', this.storyLeg, { x: 0.12, y: 0.05, z: 0 }, { x: 0.7, y: 0.7, z: 0.7 }, undefined, [0.42, 0.22, 0.08], 0.9, 0.04)
        part('bird-foot-left', this.storySphere, { x: -0.12, y: -0.08, z: 0.08 }, { x: 0.18, y: 0.06, z: 0.22 }, undefined, [0.42, 0.22, 0.08], 0.9, 0.03)
        part('bird-foot-right', this.storySphere, { x: 0.12, y: -0.08, z: 0.08 }, { x: 0.18, y: 0.06, z: 0.22 }, undefined, [0.42, 0.22, 0.08], 0.9, 0.03)
        break
      case 'coat':
        part('coat-body', this.storyBox, { x: 0, y: 0.5, z: 0 }, { x: 0.84, y: 1.05, z: 0.48 }, undefined, [0.78, 0.27, 0.2], 0.92, 0.04)
        part('coat-sleeve-left', this.storyLeg, { x: -0.5, y: 0.52, z: 0 }, { x: 0.5, y: 0.6, z: 0.5 }, { x: 0, y: 0, z: -0.35 }, [0.78, 0.27, 0.2], 0.92, 0.04)
        part('coat-sleeve-right', this.storyLeg, { x: 0.5, y: 0.52, z: 0 }, { x: 0.5, y: 0.6, z: 0.5 }, { x: 0, y: 0, z: 0.35 }, [0.78, 0.27, 0.2], 0.92, 0.04)
        part('coat-collar', this.storyRing, { x: 0, y: 0.93, z: 0 }, { x: 0.62, y: 0.12, z: 0.62 }, undefined, [0.96, 0.5, 0.28], 0.9, 0.03)
        part('coat-button-one', this.storySphere, { x: 0, y: 0.63, z: 0.27 }, { x: 0.1, y: 0.1, z: 0.05 }, undefined, [1, 0.76, 0.3], 0.3, 0.01, false)
        part('coat-button-two', this.storySphere, { x: 0, y: 0.38, z: 0.27 }, { x: 0.1, y: 0.1, z: 0.05 }, undefined, [1, 0.76, 0.3], 0.3, 0.01, false)
        break
      case 'carrot':
        part('carrot-body', this.storyCone, { x: 0, y: 0.45, z: 0 }, { x: 0.7, y: 1, z: 0.7 }, { x: Math.PI, y: 0, z: 0 }, [0.95, 0.38, 0.1], 0.88, 0.04)
        part('carrot-leaf-left', this.storyLeaf, { x: -0.2, y: 1.02, z: 0 }, { x: 0.2, y: 0.48, z: 0.14 }, { x: 0, y: 0, z: -0.45 }, [0.2, 0.62, 0.2], 0.9, 0.04)
        part('carrot-leaf-right', this.storyLeaf, { x: 0.2, y: 1.02, z: 0 }, { x: 0.2, y: 0.48, z: 0.14 }, { x: 0, y: 0, z: 0.45 }, [0.2, 0.62, 0.2], 0.9, 0.04)
        part('carrot-leaf-center', this.storyLeaf, { x: 0, y: 1.1, z: 0 }, { x: 0.22, y: 0.52, z: 0.16 }, undefined, [0.16, 0.55, 0.18], 0.9, 0.04)
        break
      case 'snowflake':
        for (let index = 0; index < 6; index += 1) {
          const angle = (index / 6) * Math.PI * 2
          part(`snowflake-ray-${index}`, this.storyFeather, { x: 0, y: 0.72, z: 0 }, { x: 0.14, y: 0.52, z: 0.07 }, { x: 0, y: 0, z: angle }, [0.86, 0.96, 1], 0.34, 0.01, false)
        }
        part('snowflake-center', this.storySphere, { x: 0, y: 0.72, z: 0 }, { x: 0.24, y: 0.24, z: 0.18 }, undefined, [0.95, 0.99, 1], 0.25, 0, false)
        break
      case 'balloon':
        part('balloon-body', this.storySphere, { x: 0, y: 0.9, z: 0 }, { x: 0.78, y: 0.92, z: 0.78 }, undefined, [0.95, 0.35, 0.55], 0.28, 0.01)
        part('balloon-highlight', this.storySphere, { x: -0.22, y: 1.12, z: 0.52 }, { x: 0.16, y: 0.2, z: 0.08 }, undefined, [1, 0.82, 0.86], 0.15, 0, false)
        part('balloon-knot', this.storyCone, { x: 0, y: 0.35, z: 0 }, { x: 0.18, y: 0.18, z: 0.18 }, undefined, [0.78, 0.2, 0.36], 0.65, 0.02)
        part('balloon-string', this.storyLeg, { x: 0, y: -0.02, z: 0 }, { x: 0.05, y: 0.6, z: 0.05 }, undefined, [0.78, 0.72, 0.6], 0.7, 0.01, false)
        break
    }
    return root
  }

  private createEnvironment(): void {
    const ground = new Node('story-meadow')
    ground.mesh = this.meshes.ground
    ground.roughness = 0.98
    ground.detailStrength = 0.1
    ground.castShadow = false
    this.add(ground)
    const sun = new Node('story-sun')
    sun.mesh = this.meshes.flower
    sun.position.set(-7, 9, -18)
    sun.scale.set(2.4, 2.4, 0.35)
    sun.emissive = [0.6, 0.3, 0.04]
    sun.castShadow = false
    this.add(sun)
    for (const [x, z, scale, height] of [
      [-11, -15, 7, 7],
      [-3, -17, 10, 10],
      [6, -16, 8, 8],
      [12, -14, 6, 6],
    ] as const) {
      const mountain = new Node('story-mountain')
      mountain.mesh = this.meshes.mountain
      mountain.position.set(x, groundHeight(x, z) - 0.1, z)
      mountain.scale.set(scale, height, scale * 0.8)
      mountain.roughness = 0.94
      this.add(mountain)
    }
    for (const [x, z, height] of [
      [-8, 2, 2.2],
      [8, 1, 2.4],
      [-6, -4, 1.9],
      [6, -4, 2.1],
    ] as const) {
      const tree = new Node('story-tree')
      tree.position.set(x, groundHeight(x, z), z)
      this.add(tree)
      const trunk = new Node('story-tree-trunk')
      trunk.mesh = this.meshes.treeTrunk
      trunk.position.y = height * 0.42
      trunk.scale.set(0.8, height / 1.6, 0.8)
      trunk.setParent(tree)
      const top = new Node('story-tree-top')
      top.mesh = this.meshes.treeTop
      top.position.y = height * 0.86
      top.scale.set(height * 0.55, height * 0.55, height * 0.55)
      top.setParent(tree)
    }
  }
}

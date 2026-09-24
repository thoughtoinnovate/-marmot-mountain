import {
  Camera,
  createBox,
  createCylinder,
  createOctahedron,
  createSphere,
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
    this.storyStar = engine.renderer.createMesh(createOctahedron(0.65, [1, 0.78, 0.2]))
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
    ): void => {
      const child = new Node(`${choice.id}-${name}`)
      child.mesh = mesh
      child.position.set(position.x, position.y, position.z)
      child.scale.set(scale.x, scale.y, scale.z)
      child.tint = choice.tint
      child.roughness = 0.88
      child.detailStrength = 0.04
      if (rotation) {
        child.rotation.set(rotation.x, rotation.y, rotation.z)
      }
      child.setParent(root)
    }
    switch (choice.kind) {
      case 'flower':
        part('stem', this.meshes.treeTrunk, { x: 0, y: -0.2, z: 0 }, { x: 0.18, y: 0.4, z: 0.18 })
        part('bloom', this.storyStar, { x: 0, y: 0.55, z: 0 }, { x: 0.75, y: 0.75, z: 0.75 })
        break
      case 'acorn':
        part('body', this.storySphere, { x: 0, y: 0.3, z: 0 }, { x: 0.8, y: 1, z: 0.8 })
        part('cap', this.storyCone, { x: 0, y: 0.78, z: 0 }, { x: 0.65, y: 0.38, z: 0.65 }, { x: Math.PI, y: 0, z: 0 })
        break
      case 'rock':
        part('rock', this.meshes.rock, { x: 0, y: 0.25, z: 0 }, { x: 1.15, y: 0.7, z: 1 })
        break
      case 'star':
        part('star', this.storyStar, { x: 0, y: 0.7, z: 0 }, { x: 1, y: 1, z: 1 })
        break
      case 'leaf':
        part('leaf', this.storyLeaf, { x: 0, y: 0.6, z: 0 }, { x: 0.6, y: 1.1, z: 0.35 }, { x: 0, y: 0.4, z: 0.45 })
        break
      case 'berry':
        part('berry', this.storySphere, { x: 0, y: 0.45, z: 0 }, { x: 0.5, y: 0.5, z: 0.5 })
        part('leaf', this.storyLeaf, { x: 0.2, y: 0.85, z: 0 }, { x: 0.35, y: 0.45, z: 0.2 }, { x: 0, y: 0, z: 0.5 })
        break
      case 'marmot':
        part('body', this.meshes.body, { x: 0, y: 0.35, z: 0 }, { x: 0.55, y: 0.72, z: 0.5 })
        part('head', this.meshes.head, { x: 0, y: 0.95, z: 0 }, { x: 0.5, y: 0.52, z: 0.48 })
        part('nose', this.meshes.nose, { x: 0, y: 0.94, z: 0.27 }, { x: 0.25, y: 0.2, z: 0.2 })
        break
      case 'squirrel':
        part('body', this.meshes.body, { x: 0, y: 0.42, z: 0 }, { x: 0.45, y: 0.75, z: 0.45 })
        part('tail', this.meshes.body, { x: 0.3, y: 0.55, z: -0.25 }, { x: 0.35, y: 0.95, z: 0.35 }, { x: 0, y: 0, z: -0.45 })
        part('head', this.meshes.head, { x: 0, y: 1, z: 0 }, { x: 0.46, y: 0.48, z: 0.44 })
        break
      case 'nest':
        part('nest', this.storyRing, { x: 0, y: 0.38, z: 0 }, { x: 1, y: 0.7, z: 1 })
        part('leaf', this.storyLeaf, { x: 0.2, y: 0.6, z: 0 }, { x: 0.25, y: 0.45, z: 0.2 }, { x: 0, y: 0.2, z: 0.3 })
        break
      case 'bird':
        part('body', this.storySphere, { x: 0, y: 0.45, z: 0 }, { x: 0.55, y: 0.7, z: 0.45 })
        part('head', this.storySphere, { x: 0, y: 0.95, z: 0 }, { x: 0.38, y: 0.38, z: 0.38 })
        part('beak', this.storyCone, { x: 0, y: 0.93, z: 0.35 }, { x: 0.25, y: 0.25, z: 0.25 }, { x: Math.PI / 2, y: 0, z: 0 })
        break
      case 'coat':
        part('coat', this.storyBox, { x: 0, y: 0.45, z: 0 }, { x: 0.8, y: 1, z: 0.45 })
        part('button', this.meshes.flower, { x: 0, y: 0.55, z: 0.27 }, { x: 0.15, y: 0.15, z: 0.15 })
        break
      case 'carrot':
        part('carrot', this.storyCone, { x: 0, y: 0.45, z: 0 }, { x: 0.65, y: 1, z: 0.65 }, { x: Math.PI, y: 0, z: 0 })
        part('top', this.storyLeaf, { x: 0, y: 0.95, z: 0 }, { x: 0.3, y: 0.5, z: 0.25 })
        break
      case 'snowflake':
        part('snowflake', this.meshes.snowflake, { x: 0, y: 0.7, z: 0 }, { x: 1.4, y: 1.4, z: 1.4 })
        break
      case 'balloon':
        part('balloon', this.storySphere, { x: 0, y: 0.85, z: 0 }, { x: 0.75, y: 0.9, z: 0.75 })
        part('string', this.meshes.treeTrunk, { x: 0, y: 0.15, z: 0 }, { x: 0.08, y: 0.35, z: 0.08 })
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

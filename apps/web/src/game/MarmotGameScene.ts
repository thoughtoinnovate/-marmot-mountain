import {
  Camera,
  Node,
  Scene,
  Vec3,
  type Color,
  type Engine,
  type PointerPosition,
} from '@marmot/engine'
import type { GameUI } from './GameUI'
import { MeshLibrary, groundHeight } from './MeshLibrary'
import { MarmotTarget, type HolePosition } from './MarmotTarget'
import { ParticleBursts } from './ParticleBursts'
import {
  ROUND_DURATION_SECONDS,
  calculateCatchPoints,
  getDifficulty,
} from './difficulty'

type GameState = 'ready' | 'playing' | 'paused' | 'ended'

interface SnowParticle {
  node: Node
  speed: number
  drift: number
}

export class MarmotGameScene extends Scene {
  private readonly meshes: MeshLibrary
  private readonly bursts: ParticleBursts
  private readonly targets: MarmotTarget[] = []
  private readonly snow: SnowParticle[] = []
  private readonly holes: HolePosition[] = [
    { x: -4.2, z: 0.7 },
    { x: -2.15, z: -1.25 },
    { x: 0, z: 0.35 },
    { x: 2.25, z: -0.65 },
    { x: 4.15, z: 1.15 },
    { x: 0.3, z: -3.15 },
  ]
  private state: GameState = 'ready'
  private elapsed = 0
  private score = 0
  private combo = 0
  private caught = 0
  private best = 0
  private spawnTimer = 0.35
  private ambientTimer = 0.2
  private lastMissAt = -Infinity
  private readonly pointerUnsubscribe: () => void
  private readonly keyUnsubscribe: () => void

  private readonly handleTargetMiss = (): void => {
    if (this.state === 'playing') {
      this.combo = 0
    }
  }

  private readonly handleTargetFinished = (_target: MarmotTarget): void => {
    this.ambientTimer = Math.max(0, this.ambientTimer)
  }

  constructor(
    private readonly engine: Engine,
    private readonly ui: GameUI,
  ) {
    super(new Camera(), [0.53, 0.77, 0.88])
    this.meshes = new MeshLibrary(engine.renderer)
    this.bursts = new ParticleBursts(this, this.meshes)
    this.best = this.readBest()
    this.createEnvironment()
    this.createTargets()
    this.ui.setReadyValues(this.best)
    this.pointerUnsubscribe = this.engine.input.onPointerDown((pointer) => this.handlePointer(pointer))
    this.keyUnsubscribe = this.engine.input.onKeyDown((event) => this.handleKey(event))
  }

  start(): void {
    this.resetRound()
    this.state = 'playing'
    this.ui.show('playing')
    this.ui.updateHud(0, ROUND_DURATION_SECONDS, 0, 0)
    void this.engine.audio.unlock().then(() => this.engine.audio.start())
  }

  pause(): void {
    if (this.state !== 'playing') {
      return
    }
    this.state = 'paused'
    for (const target of this.targets) {
      target.setUpdatesEnabled(false)
    }
    this.ui.show('paused')
    this.engine.audio.pause()
  }

  resume(): void {
    if (this.state !== 'paused') {
      return
    }
    this.state = 'playing'
    for (const target of this.targets) {
      target.setUpdatesEnabled(true)
    }
    this.ui.show('playing')
  }

  toggleSound(muted: boolean): void {
    this.engine.audio.setVolume(muted ? 0 : 0.3)
  }

  override update(deltaTime: number): void {
    this.updateCamera(deltaTime)
    if (this.state === 'ready') {
      this.ambientTimer -= deltaTime
      if (this.ambientTimer <= 0) {
        this.ambientTimer = 1.15
        this.activateRandomTarget(getDifficulty(0))
      }
    } else if (this.state === 'playing') {
      this.updateRound(deltaTime)
    }
    this.updateSnow(deltaTime)
    super.update(deltaTime)
    this.ui.updateHud(
      this.score,
      ROUND_DURATION_SECONDS - this.elapsed,
      this.combo,
      deltaTime,
    )
  }

  destroy(): void {
    this.pointerUnsubscribe()
    this.keyUnsubscribe()
    this.bursts.clear()
    this.meshes.destroy()
  }

  private updateRound(deltaTime: number): void {
    this.elapsed = Math.min(ROUND_DURATION_SECONDS, this.elapsed + deltaTime)
    if (this.elapsed >= ROUND_DURATION_SECONDS) {
      this.endRound()
      return
    }
    const difficulty = getDifficulty(this.elapsed)
    this.spawnTimer -= deltaTime
    if (this.spawnTimer <= 0) {
      const activeCount = this.targets.filter((target) => target.active).length
      if (activeCount < difficulty.maximumActive) {
        this.activateRandomTarget(difficulty)
        this.spawnTimer = difficulty.spawnInterval * (0.82 + Math.random() * 0.36)
      } else {
        this.spawnTimer = 0.12
      }
    }
  }

  private endRound(): void {
    this.state = 'ended'
    for (const target of this.targets) {
      target.dismiss()
      target.setUpdatesEnabled(true)
    }
    const previousBest = this.best
    this.best = Math.max(this.best, this.score)
    this.writeBest(this.best)
    this.ui.showResults(this.score, this.caught, this.best, this.score > previousBest)
    this.ui.show('ended')
    this.engine.audio.finish(this.score)
  }

  private resetRound(): void {
    this.elapsed = 0
    this.score = 0
    this.combo = 0
    this.caught = 0
    this.spawnTimer = 0.14
    for (const target of this.targets) {
      target.finishImmediately()
      target.setUpdatesEnabled(true)
    }
    this.bursts.clear()
  }

  private activateRandomTarget(difficulty: ReturnType<typeof getDifficulty>): void {
    const available = this.targets.filter((target) => !target.active)
    if (available.length === 0) {
      return
    }
    const target = available[Math.floor(Math.random() * available.length)]
    if (target) {
      target.activate(difficulty)
    }
  }

  private handlePointer(pointer: PointerPosition): void {
    if (this.state !== 'playing') {
      return
    }
    const ray = this.camera.screenRay(
      pointer.canvasX,
      pointer.canvasY,
      this.engine.canvas.clientWidth,
      this.engine.canvas.clientHeight,
    )
    let closest: MarmotTarget | null = null
    let closestDistance = Number.POSITIVE_INFINITY
    const center = new Vec3()
    for (const target of this.targets) {
      if (!target.hittable) {
        continue
      }
      const distance = ray.intersectSphere(target.hitCenter(center), target.hitRadius)
      if (distance !== null && distance < closestDistance) {
        closest = target
        closestDistance = distance
      }
    }
    if (closest?.catch()) {
      this.combo += 1
      this.caught += 1
      const difficulty = getDifficulty(this.elapsed)
      const points = calculateCatchPoints(closest.reactionTime, difficulty, this.combo)
      this.score += points
      closest.hitCenter(center)
      this.bursts.burst(center, comboColor(this.combo))
      this.engine.audio.catch(this.combo)
      this.ui.showCatch(pointer.clientX, pointer.clientY, points, this.combo)
      this.ui.activateCombo(2.2)
    } else if (performance.now() - this.lastMissAt > 360) {
      this.lastMissAt = performance.now()
      this.engine.audio.miss()
    }
  }

  private handleKey(event: KeyboardEvent): void {
    if (event.code === 'Enter' && (this.state === 'ready' || this.state === 'ended')) {
      this.start()
      return
    }
    if (event.code === 'Escape' || event.code === 'KeyP') {
      if (this.state === 'playing') {
        this.pause()
      } else if (this.state === 'paused') {
        this.resume()
      }
    }
  }

  private updateCamera(deltaTime: number): void {
    const aspect = this.engine.canvas.clientWidth / Math.max(this.engine.canvas.clientHeight, 1)
    const portrait = aspect < 0.82
    const desiredPosition = portrait ? new Vec3(0, 9.2, 20.5) : new Vec3(0, 7.2, 13.2)
    const desiredTarget = portrait ? new Vec3(0, 0.75, -1.8) : new Vec3(0, 0.85, -2.25)
    const smoothing = 1 - Math.exp(-deltaTime * 5)
    this.camera.position.lerp(desiredPosition, smoothing)
    this.camera.target.lerp(desiredTarget, smoothing)
    this.camera.fieldOfView = portrait ? 0.9 : 0.76
    this.camera.update(aspect)
  }

  private updateSnow(deltaTime: number): void {
    for (const flake of this.snow) {
      flake.node.position.y -= flake.speed * deltaTime
      flake.node.position.x += Math.sin(flake.node.position.y * 0.7) * flake.drift * deltaTime
      if (flake.node.position.y < 0.1) {
        flake.node.position.y = 8 + Math.random() * 4
        flake.node.position.x = -9 + Math.random() * 18
        flake.node.position.z = -10 + Math.random() * 10
      }
    }
  }

  private createEnvironment(): void {
    const ground = new Node('alpine-meadow')
    ground.mesh = this.meshes.ground
    ground.castShadow = false
    this.add(ground)

    const sun = new Node('sun-disc')
    sun.mesh = this.meshes.flower
    sun.position.set(-7.5, 10.5, -20)
    sun.scale.set(2.7, 2.7, 0.4)
    sun.tint = [1, 0.78, 0.24]
    sun.castShadow = false
    this.add(sun)

    const mountainData: readonly [number, number, number, number, number][] = [
      [-12, -14, 6.8, 7.5, -0.12],
      [-6, -15, 9.5, 9.2, 0.08],
      [0.2, -16, 7.2, 7.8, 0.02],
      [6.3, -15, 10.4, 10.2, -0.1],
      [12.5, -14, 6.5, 7.2, 0.1],
      [-1.8, -20, 15.5, 13.5, 0.04],
    ]
    for (const [x, z, scaleX, scaleY, tint] of mountainData) {
      const mountain = new Node('snowy-mountain')
      mountain.mesh = this.meshes.mountain
      mountain.position.set(x, groundHeight(x, z) - 0.08, z)
      mountain.scale.set(scaleX, scaleY, scaleX * 0.86)
      mountain.tint = [1 + tint, 1, 1 - tint * 0.25]
      this.add(mountain)
    }

    for (const [x, z, height, rotation] of [
      [-9.5, 2.7, 2.8, 0.3],
      [-8.4, -3.8, 2.3, -0.2],
      [-7.2, 5.2, 2.5, 0.1],
      [8.4, 2.4, 2.5, -0.3],
      [9.4, -3.5, 3.1, 0.15],
      [7.1, 5.2, 2.25, -0.1],
    ] as const) {
      this.createTree(x, z, height, rotation)
    }

    for (const [x, z, scale] of [
      [-6.4, 2.6, 0.55],
      [5.9, 2.2, 0.7],
      [-5.8, -3.8, 0.48],
      [6.2, -3.2, 0.6],
      [1.9, 4.5, 0.42],
    ] as const) {
      const rock = new Node('meadow-rock')
      rock.mesh = this.meshes.rock
      rock.position.set(x, groundHeight(x, z) + scale * 0.3, z)
      rock.scale.set(scale * 1.4, scale * 0.75, scale)
      rock.rotation.y = Math.random() * Math.PI
      this.add(rock)
    }

    this.createFlowers()
    this.createClouds()
    this.createSnow()
    for (const hole of this.holes) {
      this.createHole(hole)
    }
  }

  private createHole(hole: HolePosition): void {
    const baseY = groundHeight(hole.x, hole.z) + 0.035
    const dark = new Node('marmot-hole')
    dark.mesh = this.meshes.darkHole
    dark.position.set(hole.x, baseY, hole.z)
    dark.scale.set(1.15, 1, 0.92)
    dark.castShadow = false
    this.add(dark)
    const rim = new Node('dirt-rim')
    rim.mesh = this.meshes.dirtRim
    rim.position.set(hole.x, baseY + 0.065, hole.z)
    rim.scale.set(1.08, 0.75, 0.94)
    this.add(rim)
  }

  private createTargets(): void {
    for (const [index, hole] of this.holes.entries()) {
      const target = new MarmotTarget(
        `marmot-${index + 1}`,
        hole,
        this.meshes,
        {
          onMiss: this.handleTargetMiss,
          onFinished: this.handleTargetFinished,
        },
      )
      target.position.set(hole.x, groundHeight(hole.x, hole.z) + 0.08, hole.z)
      target.setUpdatesEnabled(true)
      this.targets.push(target)
      this.add(target)
    }
  }

  private createTree(x: number, z: number, height: number, rotation: number): void {
    const group = new Node('alpine-tree')
    group.position.set(x, groundHeight(x, z), z)
    group.rotation.y = rotation
    this.add(group)
    const trunk = new Node('tree-trunk')
    trunk.mesh = this.meshes.treeTrunk
    trunk.position.y = height * 0.42
    trunk.scale.set(0.8, height / 1.6, 0.8)
    trunk.setParent(group)
    const top = new Node('tree-top')
    top.mesh = this.meshes.treeTop
    top.position.y = height * 0.86
    top.scale.set(height * 0.55, height * 0.55, height * 0.55)
    top.rotation.y = rotation * 0.4
    top.setParent(group)
  }

  private createFlowers(): void {
    for (let index = 0; index < 28; index += 1) {
      const x = -8 + Math.random() * 16
      const z = -6 + Math.random() * 10
      if (Math.abs(x) < 5 && z > -3 && z < 3) {
        continue
      }
      const flower = new Node('wildflower')
      flower.mesh = this.meshes.flower
      flower.position.set(x, groundHeight(x, z) + 0.16, z)
      const scale = 0.7 + Math.random() * 0.7
      flower.scale.set(scale, scale, scale)
      flower.rotation.y = Math.random() * Math.PI
      flower.tint = [0.95, 0.7 + Math.random() * 0.2, 0.25]
      flower.castShadow = false
      this.add(flower)
    }
  }

  private createClouds(): void {
    for (const [x, y, z, scale] of [
      [-8, 8.5, -18, 1.5],
      [6, 9.5, -19, 1.8],
      [0, 11, -21, 1.15],
    ] as const) {
      const cloud = new Node('cloud')
      cloud.position.set(x, y, z)
      cloud.scale.set(scale * 1.8, scale * 0.65, scale)
      cloud.castShadow = false
      this.add(cloud)
      for (const [partX, partY, partZ, partScale] of [
        [-0.55, 0, 0, 0.75],
        [0, 0.12, 0, 1],
        [0.58, 0, 0, 0.7],
      ] as const) {
        const part = new Node('cloud-puff')
        part.mesh = this.meshes.cloud
        part.position.set(partX, partY, partZ)
        part.scale.set(partScale, partScale * 0.7, partScale)
        part.castShadow = false
        part.setParent(cloud)
      }
    }
  }

  private createSnow(): void {
    for (let index = 0; index < 48; index += 1) {
      const node = new Node('snowflake')
      node.mesh = this.meshes.snowflake
      node.position.set(-10 + Math.random() * 20, 1 + Math.random() * 11, -11 + Math.random() * 12)
      const scale = 0.7 + Math.random() * 0.6
      node.scale.set(scale, scale, scale)
      node.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2)
      node.castShadow = false
      const snowflake: SnowParticle = {
        node,
        speed: 0.4 + Math.random() * 0.9,
        drift: 0.12 + Math.random() * 0.22,
      }
      this.snow.push(snowflake)
      this.add(node)
    }
  }

  private readBest(): number {
    try {
      return Number(window.localStorage.getItem('marmot-mountain-best') ?? 0) || 0
    } catch {
      return 0
    }
  }

  private writeBest(value: number): void {
    try {
      window.localStorage.setItem('marmot-mountain-best', String(value))
    } catch {
      return
    }
  }
}

function comboColor(combo: number): Color {
  const colors: readonly Color[] = [
    [1, 0.77, 0.26],
    [0.42, 0.92, 0.75],
    [0.48, 0.76, 1],
    [1, 0.58, 0.48],
  ]
  return colors[(combo - 1) % colors.length] ?? colors[0]!
}

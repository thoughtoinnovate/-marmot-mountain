import {
  Camera,
  createGround,
  createOctahedron,
  createSphere,
  createTorus,
  Node,
  Scene,
  transformPoint,
  Vec3,
  type Engine,
  type Mesh,
} from '@marmot/engine'

export interface OrbitTarget {
  node: Node
  angle: number
  radius: number
  speed: number
  alive: boolean
  respawn: number
}

export interface SampleStats {
  score: number
  timeRemaining: number
  combo: number
}

export class SampleScene extends Scene {
  private readonly targets: OrbitTarget[] = []
  private readonly groundMesh: Mesh
  private readonly targetMesh: Mesh
  private readonly beaconMesh: Mesh
  private readonly ringMesh: Mesh
  private readonly beacon: Node
  private elapsed = 0
  private timeRemaining = 30
  private score = 0
  private combo = 0
  private state: 'ready' | 'playing' | 'ended' = 'ready'

  constructor(
    engine: Engine,
    private readonly onStats: (stats: SampleStats) => void,
    private readonly onEnd: (score: number) => void,
  ) {
    super(new Camera(), [0.06, 0.11, 0.16])
    this.camera.position.set(0, 7.2, 12)
    this.camera.target.set(0, 1, 0)
    this.camera.fieldOfView = 0.72
    this.groundMesh = engine.renderer.createMesh(
      createGround(18, 18, 12, 12, () => 0, () => [0.08, 0.15, 0.2]),
    )
    this.targetMesh = engine.renderer.createMesh(createSphere(0.58, 12, 8, [0.25, 0.8, 0.95]))
    this.beaconMesh = engine.renderer.createMesh(createOctahedron(1.1, [1, 0.58, 0.24]))
    this.ringMesh = engine.renderer.createMesh(createTorus(2.25, 0.08, 32, 6, [0.16, 0.58, 0.64]))
    const ground = new Node('sample-ground')
    ground.mesh = this.groundMesh
    ground.position.y = -0.03
    ground.castShadow = false
    this.add(ground)
    this.beacon = new Node('sample-beacon')
    this.beacon.mesh = this.beaconMesh
    this.beacon.position.y = 1.2
    this.add(this.beacon)
    const ring = new Node('sample-orbit-ring')
    ring.mesh = this.ringMesh
    ring.position.y = 1.15
    ring.rotation.x = Math.PI / 2
    ring.castShadow = false
    this.add(ring)
    for (let index = 0; index < 5; index += 1) {
      this.addTarget(index)
    }
  }

  start(): void {
    this.elapsed = 0
    this.timeRemaining = 30
    this.score = 0
    this.combo = 0
    this.state = 'playing'
    for (const target of this.targets) {
      target.alive = true
      target.respawn = 0
      target.node.visible = true
    }
    this.emitStats()
  }

  pick(pointerX: number, pointerY: number, width: number, height: number): OrbitTarget | null {
    if (this.state !== 'playing') {
      return null
    }
    const ray = this.camera.screenRay(pointerX, pointerY, width, height)
    const center = new Vec3()
    let closest: OrbitTarget | null = null
    let distanceValue = Number.POSITIVE_INFINITY
    for (const target of this.targets) {
      if (!target.alive) {
        continue
      }
      transformPoint(center, target.node.worldMatrix, new Vec3())
      const distance = ray.intersectSphere(center, 0.72)
      if (distance !== null && distance < distanceValue) {
        closest = target
        distanceValue = distance
      }
    }
    return closest
  }

  catchTarget(target: OrbitTarget): boolean {
    if (this.state !== 'playing' || !target.alive) {
      return false
    }
    target.alive = false
    target.node.visible = false
    target.respawn = 0.8 + Math.random() * 0.5
    this.combo += 1
    this.score += this.combo * 10
    this.emitStats()
    return true
  }

  override update(deltaTime: number): void {
    this.elapsed += deltaTime
    if (this.state === 'playing') {
      this.timeRemaining = Math.max(0, this.timeRemaining - deltaTime)
      if (this.timeRemaining <= 0) {
        this.state = 'ended'
        this.onEnd(this.score)
      }
    }
    for (const target of this.targets) {
      target.angle += target.speed * deltaTime
      target.node.position.set(
        Math.cos(target.angle) * target.radius,
        1.15 + Math.sin(target.angle * 1.7) * 0.55,
        Math.sin(target.angle) * target.radius,
      )
      target.node.rotation.y += deltaTime * 2
      if (!target.alive) {
        target.respawn -= deltaTime
        if (target.respawn <= 0) {
          target.alive = true
          target.node.visible = true
        }
      }
    }
    this.beacon.rotation.y = this.elapsed * 0.7
    this.beacon.rotation.x = Math.sin(this.elapsed) * 0.16
    super.update(deltaTime)
    if (this.state === 'playing') {
      this.emitStats()
    }
  }

  destroy(): void {
    this.clear()
    this.groundMesh.destroy()
    this.targetMesh.destroy()
    this.beaconMesh.destroy()
    this.ringMesh.destroy()
  }

  private addTarget(index: number): void {
    const node = new Node(`satellite-${index + 1}`)
    node.mesh = this.targetMesh
    const angle = (index / 5) * Math.PI * 2
    node.position.set(Math.cos(angle) * 2.3, 1.2, Math.sin(angle) * 2.3)
    this.targets.push({
      node,
      angle,
      radius: 2.3,
      speed: 0.55 + index * 0.11,
      alive: true,
      respawn: 0,
    })
    this.add(node)
  }

  private emitStats(): void {
    this.onStats({
      score: this.score,
      timeRemaining: this.timeRemaining,
      combo: this.combo,
    })
  }
}
